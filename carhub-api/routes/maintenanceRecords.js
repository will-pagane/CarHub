const cors = require('cors')({ origin: true });
const { firestore, FieldValue, Timestamp } = require('../utils/firebase');
const { authenticateToken } = require('../utils/auth');
const { convertTimestampsToISO } = require('../utils/helpers');

exports.getMaintenanceRecords = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      const { vehicleId } = req.query;
      if (!vehicleId) return res.status(400).send('Bad Request: vehicleId query parameter is required.');
      try {
        const recordsSnapshot = await firestore
          .collection('users').doc(userId)
          .collection('maintenanceRecords')
          .where('vehicleId', '==', vehicleId)
          .orderBy('date', 'desc')
          .orderBy('createdAt', 'desc')
          .get();
        const records = [];
        recordsSnapshot.forEach(doc => records.push(convertTimestampsToISO({ id: doc.id, ...doc.data() })));
        res.status(200).json(records);
      } catch (error) {
        console.error(`[CF:getMaintenanceRecords] Error for user ${userId}, vehicle ${vehicleId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};

exports.addMaintenanceRecord = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      const { vehicleId, date, description, cost, type, category, notes, mileage } = req.body;
      if (!vehicleId || !date || !description || description.trim() === '' || cost == null || !type || !category) {
        return res.status(400).send('Bad Request: Missing required maintenance record fields.');
      }
      const dateObject = new Date(date);
      if (isNaN(dateObject.getTime())) {
        return res.status(400).send('Bad Request: Invalid date format.');
      }
      const recordData = {
        vehicleId,
        date: Timestamp.fromDate(dateObject),
        mileage: mileage != null ? parseFloat(mileage) : null,
        description: description.trim(),
        cost: parseFloat(cost),
        type,
        category,
        notes: notes?.trim() || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      try {
        const docRef = await firestore.collection('users').doc(userId).collection('maintenanceRecords').add(recordData);
        const snapshot = await docRef.get();
        res.status(201).json(convertTimestampsToISO({ id: snapshot.id, ...snapshot.data() }));
      } catch (error) {
        console.error(`[CF:addMaintenanceRecord] Error for user ${userId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};

exports.updateMaintenanceRecord = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'PUT') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      const recordId = req.params.recordId || req.path.split('/').pop();
      const { vehicleId, date, description, cost, type, category, notes, mileage } = req.body;
      if (!recordId) return res.status(400).send('Bad Request: recordId is required in URL path.');
      if (!vehicleId || !date || !description || description.trim() === '' || cost == null || !type || !category) {
        return res.status(400).send('Bad Request: Missing required fields for update.');
      }
      const dateObject = new Date(date);
      if (isNaN(dateObject.getTime())) {
        return res.status(400).send('Bad Request: Invalid date format.');
      }
      const recordDataToUpdate = {
        date: Timestamp.fromDate(dateObject),
        mileage: mileage != null ? parseFloat(mileage) : null,
        description: description.trim(),
        cost: parseFloat(cost),
        type,
        category,
        notes: notes?.trim() || null,
        updatedAt: FieldValue.serverTimestamp(),
      };
      try {
        const recordRef = firestore.collection('users').doc(userId).collection('maintenanceRecords').doc(recordId);
        const doc = await recordRef.get();
        if (!doc.exists) return res.status(404).send('Maintenance record not found.');
        recordDataToUpdate.vehicleId = doc.data().vehicleId;
        await recordRef.update(recordDataToUpdate);
        const snapshot = await recordRef.get();
        res.status(200).json(convertTimestampsToISO({ id: snapshot.id, ...snapshot.data() }));
      } catch (error) {
        console.error(`[CF:updateMaintenanceRecord] Error for user ${userId}, record ${recordId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};

exports.deleteMaintenanceRecord = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'DELETE') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      const recordId = req.params.recordId || req.path.split('/').pop();
      if (!recordId) return res.status(400).send('Bad Request: recordId is required in URL path.');
      try {
        const recordRef = firestore.collection('users').doc(userId).collection('maintenanceRecords').doc(recordId);
        const doc = await recordRef.get();
        if (!doc.exists) return res.status(404).send('Maintenance record not found.');
        await recordRef.delete();
        res.status(204).send();
      } catch (error) {
        console.error(`[CF:deleteMaintenanceRecord] Error for user ${userId}, record ${recordId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};
