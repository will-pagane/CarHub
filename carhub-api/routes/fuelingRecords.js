const cors = require('cors')({ origin: true });
const { firestore, FieldValue, Timestamp } = require('../utils/firebase');
const { authenticateToken } = require('../utils/auth');
const { convertTimestampsToISO } = require('../utils/helpers');

async function calculateKmPerLiterForRecord(userId, vehicleId, currentRecordData, recordIdToExclude = null) {
  if (!currentRecordData.isFullTank || currentRecordData.mileage == null || currentRecordData.liters == null || currentRecordData.liters <= 0) {
    return null;
  }
  let query = firestore
    .collection('users').doc(userId)
    .collection('fuelingRecords')
    .where('vehicleId', '==', vehicleId)
    .where('isFullTank', '==', true)
    .where('mileage', '<', currentRecordData.mileage)
    .orderBy('mileage', 'desc');
  const previousRecordsSnapshot = await query.get();
  if (previousRecordsSnapshot.empty) return null;
  let previousRecordData = null;
  for (const doc of previousRecordsSnapshot.docs) {
    if (doc.id !== recordIdToExclude) {
      previousRecordData = doc.data();
      break;
    }
  }
  if (!previousRecordData) return null;
  const kmDriven = currentRecordData.mileage - previousRecordData.mileage;
  if (kmDriven > 0) {
    return parseFloat((kmDriven / currentRecordData.liters).toFixed(2));
  }
  return null;
}

exports.getFuelingRecords = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      const { vehicleId } = req.query;
      if (!vehicleId) return res.status(400).send('Bad Request: vehicleId query parameter is required.');
      try {
        const recordsSnapshot = await firestore
          .collection('users').doc(userId)
          .collection('fuelingRecords')
          .where('vehicleId', '==', vehicleId)
          .orderBy('date', 'desc')
          .orderBy('createdAt', 'desc')
          .get();
        const records = [];
        recordsSnapshot.forEach(doc => records.push(convertTimestampsToISO({ id: doc.id, ...doc.data() })));
        res.status(200).json(records);
      } catch (error) {
        console.error(`[CF:getFuelingRecords] Error for user ${userId}, vehicle ${vehicleId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};

exports.addFuelingRecord = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      const { vehicleId, date, mileage, fuelType, liters, cost, isFullTank, station } = req.body;
      if (!vehicleId || !date || mileage == null || !fuelType || liters == null || cost == null) {
        return res.status(400).send('Bad Request: Missing required fueling record fields.');
      }
      const dateObject = new Date(date);
      if (isNaN(dateObject.getTime())) {
        return res.status(400).send('Bad Request: Invalid date format.');
      }
      const recordData = {
        vehicleId,
        date: Timestamp.fromDate(dateObject),
        mileage: parseFloat(mileage),
        fuelType,
        liters: parseFloat(liters),
        cost: parseFloat(cost),
        isFullTank: !!isFullTank,
        station: station?.trim() || null,
        kmPerLiter: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      try {
        recordData.kmPerLiter = await calculateKmPerLiterForRecord(userId, vehicleId, recordData);
        const docRef = await firestore.collection('users').doc(userId).collection('fuelingRecords').add(recordData);
        const snapshot = await docRef.get();
        res.status(201).json(convertTimestampsToISO({ id: snapshot.id, ...snapshot.data() }));
      } catch (error) {
        console.error(`[CF:addFuelingRecord] Error saving fueling record for user ${userId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};

exports.updateFuelingRecord = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'PUT') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      const recordId = req.params.recordId || req.path.split('/').pop();
      const { vehicleId, date, mileage, fuelType, liters, cost, isFullTank, station } = req.body;
      if (!recordId) return res.status(400).send('Bad Request: recordId is required in URL path.');
      if (!vehicleId || !date || mileage == null || !fuelType || liters == null || cost == null) {
        return res.status(400).send('Bad Request: Missing required fueling record fields for update.');
      }
      const dateObject = new Date(date);
      if (isNaN(dateObject.getTime())) {
        return res.status(400).send('Bad Request: Invalid date format.');
      }
      const recordDataToUpdate = {
        vehicleId,
        date: Timestamp.fromDate(dateObject),
        mileage: parseFloat(mileage),
        fuelType,
        liters: parseFloat(liters),
        cost: parseFloat(cost),
        isFullTank: !!isFullTank,
        station: station?.trim() || null,
        kmPerLiter: null,
        updatedAt: FieldValue.serverTimestamp(),
      };
      try {
        const recordRef = firestore.collection('users').doc(userId).collection('fuelingRecords').doc(recordId);
        const doc = await recordRef.get();
        if (!doc.exists) return res.status(404).send('Fueling record not found.');
        recordDataToUpdate.vehicleId = doc.data().vehicleId;
        recordDataToUpdate.kmPerLiter = await calculateKmPerLiterForRecord(userId, recordDataToUpdate.vehicleId, recordDataToUpdate, recordId);
        await recordRef.update(recordDataToUpdate);
        const snapshot = await recordRef.get();
        res.status(200).json(convertTimestampsToISO({ id: snapshot.id, ...snapshot.data() }));
      } catch (error) {
        console.error(`[CF:updateFuelingRecord] Error updating fueling record for user ${userId}, record ${recordId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};

exports.deleteFuelingRecord = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'DELETE') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      const recordId = req.params.recordId || req.path.split('/').pop();
      if (!recordId) return res.status(400).send('Bad Request: recordId is required in URL path.');
      try {
        const recordRef = firestore.collection('users').doc(userId).collection('fuelingRecords').doc(recordId);
        const doc = await recordRef.get();
        if (!doc.exists) return res.status(404).send('Fueling record not found.');
        await recordRef.delete();
        res.status(204).send();
      } catch (error) {
        console.error(`[CF:deleteFuelingRecord] Error for user ${userId}, record ${recordId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};
