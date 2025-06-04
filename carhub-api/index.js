
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors')({ origin: true }); // Allows all origins for now, configure for production

const firestore = new Firestore();
// !!! IMPORTANT: Replace with your ACTUAL Google Client ID from constants.ts or environment variable !!!
const GSI_CLIENT_ID = "520857717970-nlkvdonk9f42df8nlmomsodo13n688o6.apps.googleusercontent.com";
const authClient = new OAuth2Client(GSI_CLIENT_ID);

/**
 * Middleware to verify Google ID Token.
 * Adds req.user = { uid: userIdFromToken } if valid.
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized: Missing or invalid Authorization header.');
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    const ticket = await authClient.verifyIdToken({
        idToken: idToken,
        audience: GSI_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
        return res.status(401).send('Unauthorized: Invalid token payload.');
    }
    req.user = { uid: payload.sub }; // 'sub' is the user's unique Google ID
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    if (error.message && (error.message.includes("Token used too late") || error.message.includes("Token expired"))) {
        return res.status(401).send('Unauthorized: Token expired.');
    }
    return res.status(401).send('Unauthorized: Token verification failed.');
  }
}

// --- Vehicle Functions ---

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
        vehiclesSnapshot.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));
        console.log(`[CF:getVehicles] Found ${vehicles.length} vehicles for user ${userId}`);
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
        const docRef = await firestore
          .collection('users').doc(userId)
          .collection('vehicles')
          .add(vehicleData);
        console.log(`[CF:addVehicle] Vehicle added with ID: ${docRef.id} for user ${userId}`);
        res.status(201).json({ id: docRef.id, ...vehicleData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); // Approximate client-side timestamp
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
      const { vehicleId } = req.params; // Assuming vehicleId is in the path e.g., /vehicles/:vehicleId
      const { name, make, model, year, licensePlate } = req.body;

      if (!vehicleId) return res.status(400).send('Bad Request: vehicleId is required.');
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
        const vehicleRef = firestore
          .collection('users').doc(userId)
          .collection('vehicles').doc(vehicleId);
        await vehicleRef.update(vehicleDataToUpdate);
        console.log(`[CF:updateVehicle] Vehicle ${vehicleId} updated for user ${userId}`);
        res.status(200).json({ id: vehicleId, ...vehicleDataToUpdate, updatedAt: new Date().toISOString() });
      } catch (error) {
        console.error(`[CF:updateVehicle] Error for user ${userId}, vehicle ${vehicleId}:`, error);
        if (error.code === 5) { // Firestore NOT_FOUND
            return res.status(404).send('Vehicle not found.');
        }
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
      const { vehicleId } = req.params; // Assuming vehicleId is in the path

      if (!vehicleId) return res.status(400).send('Bad Request: vehicleId is required.');

      try {
        const vehicleRef = firestore
          .collection('users').doc(userId)
          .collection('vehicles').doc(vehicleId);

        // IMPORTANT: Delete associated fueling and maintenance records.
        // This requires careful batching or a more robust solution for larger datasets.
        const fuelingRecordsQuery = firestore.collection('users').doc(userId).collection('fuelingRecords').where('vehicleId', '==', vehicleId);
        const maintenanceRecordsQuery = firestore.collection('users').doc(userId).collection('maintenanceRecords').where('vehicleId', '==', vehicleId);

        const batch = firestore.batch();
        
        const fuelingSnapshot = await fuelingRecordsQuery.get();
        fuelingSnapshot.forEach(doc => batch.delete(doc.ref));
        
        const maintenanceSnapshot = await maintenanceRecordsQuery.get();
        maintenanceSnapshot.forEach(doc => batch.delete(doc.ref));
        
        batch.delete(vehicleRef); // Delete the vehicle itself
        
        await batch.commit();

        console.log(`[CF:deleteVehicle] Vehicle ${vehicleId} and associated records deleted for user ${userId}`);
        res.status(204).send();
      } catch (error) {
        console.error(`[CF:deleteVehicle] Error for user ${userId}, vehicle ${vehicleId}:`, error);
         if (error.code === 5) { // Firestore NOT_FOUND for the vehicle itself, could happen if already deleted
            return res.status(404).send('Vehicle not found or already deleted.');
        }
        res.status(500).send('Internal Server Error');
      }
    });
  });
};


// --- User Preferences Functions ---
exports.getUserPreferences = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      try {
        const userDocRef = firestore.collection('users').doc(userId);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
          // Optionally create a basic user document if it doesn't exist
          await userDocRef.set({ createdAt: FieldValue.serverTimestamp(), email: req.user.email || null }, { merge: true });
          console.log(`[CF:getUserPreferences] User document created for ${userId}`);
          return res.status(200).json({ activeVehicleId: null });
        }
        const preferences = userDoc.data();
        console.log(`[CF:getUserPreferences] Preferences fetched for user ${userId}`);
        res.status(200).json({ activeVehicleId: preferences?.activeVehicleId || null });
      } catch (error) {
        console.error(`[CF:getUserPreferences] Error for user ${userId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};

exports.setUserPreferences = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      const { activeVehicleId } = req.body; // Expects { activeVehicleId: "someId" | null }

      if (typeof activeVehicleId === 'undefined') {
          return res.status(400).send('Bad Request: activeVehicleId is required.');
      }

      try {
        const userDocRef = firestore.collection('users').doc(userId);
        await userDocRef.set({ activeVehicleId: activeVehicleId === "" ? null : activeVehicleId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        console.log(`[CF:setUserPreferences] Preferences updated for user ${userId}`);
        res.status(200).json({ activeVehicleId });
      } catch (error) {
        console.error(`[CF:setUserPreferences] Error for user ${userId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};

// TODO: Add Cloud Functions for FuelingRecords and MaintenanceRecords (CRUD)
// Remember to move kmPerLiter calculation to the backend for fueling records.
