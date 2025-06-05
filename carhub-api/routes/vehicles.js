const cors = require('cors')({ origin: true });
const { firestore, FieldValue } = require('../utils/firebase');
const { authenticateToken } = require('../utils/auth');
const { convertTimestampsToISO } = require('../utils/helpers');

exports.getVehicles = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      try {
        const vehiclesSnapshot = await firestore
          .collection('users').doc(userId)
          .collection('vehicles')
          .orderBy('name')
          .get();
        const vehicles = [];
        vehiclesSnapshot.forEach(doc => vehicles.push(convertTimestampsToISO({ id: doc.id, ...doc.data() })));
        res.status(200).json(vehicles);
      } catch (error) {
        console.error(`[CF:getVehicles] Error for user ${userId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};

exports.addVehicle = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      const { name, make, model, year, licensePlate } = req.body;
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).send('Bad Request: Vehicle name is required.');
      }
      const vehicleData = {
        name: name.trim(),
        make: make?.trim() || null,
        model: model?.trim() || null,
        year: year ? parseInt(year) : null,
        licensePlate: licensePlate?.trim().toUpperCase() || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      try {
        const docRef = await firestore.collection('users').doc(userId).collection('vehicles').add(vehicleData);
        const snapshot = await docRef.get();
        res.status(201).json(convertTimestampsToISO({ id: snapshot.id, ...snapshot.data() }));
      } catch (error) {
        console.error(`[CF:addVehicle] Error for user ${userId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};

exports.updateVehicle = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'PUT') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      const vehicleId = req.params.vehicleId || req.path.split('/').pop();
      const { name, make, model, year, licensePlate } = req.body;
      if (!vehicleId) return res.status(400).send('Bad Request: vehicleId is required in the URL path.');
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).send('Bad Request: Vehicle name is required.');
      }
      const vehicleDataToUpdate = {
        name: name.trim(),
        make: make?.trim() || null,
        model: model?.trim() || null,
        year: year ? parseInt(year) : null,
        licensePlate: licensePlate?.trim().toUpperCase() || null,
        updatedAt: FieldValue.serverTimestamp(),
      };
      try {
        const vehicleRef = firestore.collection('users').doc(userId).collection('vehicles').doc(vehicleId);
        await vehicleRef.update(vehicleDataToUpdate);
        const snapshot = await vehicleRef.get();
        res.status(200).json(convertTimestampsToISO({ id: snapshot.id, ...snapshot.data() }));
      } catch (error) {
        console.error(`[CF:updateVehicle] Error for user ${userId}, vehicle ${vehicleId}:`, error);
        if (error.code === 5) return res.status(404).send('Vehicle not found.');
        res.status(500).send('Internal Server Error');
      }
    });
  });
};

exports.deleteVehicle = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'DELETE') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      const vehicleId = req.params.vehicleId || req.path.split('/').pop();
      if (!vehicleId) return res.status(400).send('Bad Request: vehicleId is required in URL path.');
      try {
        const vehicleRef = firestore.collection('users').doc(userId).collection('vehicles').doc(vehicleId);
        const batch = firestore.batch();
        const fuelingQuery = firestore.collection('users').doc(userId).collection('fuelingRecords').where('vehicleId', '==', vehicleId);
        const maintenanceQuery = firestore.collection('users').doc(userId).collection('maintenanceRecords').where('vehicleId', '==', vehicleId);
        const fuelingSnapshot = await fuelingQuery.get();
        fuelingSnapshot.forEach(doc => batch.delete(doc.ref));
        const maintenanceSnapshot = await maintenanceQuery.get();
        maintenanceSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(vehicleRef);
        await batch.commit();
        res.status(204).send();
      } catch (error) {
        console.error(`[CF:deleteVehicle] Error for user ${userId}, vehicle ${vehicleId}:`, error);
        if (error.code === 5) return res.status(404).send('Vehicle not found or already deleted.');
        res.status(500).send('Internal Server Error');
      }
    });
  });
};
