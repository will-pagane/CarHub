
const { Firestore, FieldValue, Timestamp } = require('@google-cloud/firestore');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors')({ origin: true }); // Allows all origins for now, configure for production

const firestore = new Firestore();

// Read GSI_CLIENT_ID from environment variable
const GSI_CLIENT_ID = process.env.GSI_CLIENT_ID;

if (!GSI_CLIENT_ID) {
  console.error('CRITICAL ERROR: GSI_CLIENT_ID environment variable is not set. Ensure it is provided during deployment (e.g., via env.yaml).');
  // Depending on the Cloud Functions environment, this might prevent the function from initializing correctly.
  // It's crucial that this variable is set.
}

const authClient = new OAuth2Client(GSI_CLIENT_ID); // GSI_CLIENT_ID can be undefined here if not set, which will cause authClient to fail.

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

  if (!GSI_CLIENT_ID) { // Double check here as well before making the call
    console.error('Authentication cannot proceed: GSI_CLIENT_ID is not configured.');
    return res.status(500).send('Internal Server Error: Authentication service misconfigured.');
  }

  try {
    const ticket = await authClient.verifyIdToken({
        idToken: idToken,
        audience: GSI_CLIENT_ID, // GSI_CLIENT_ID used here
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
        return res.status(401).send('Unauthorized: Invalid token payload.');
    }
    req.user = { uid: payload.sub, email: payload.email }; // 'sub' is the user's unique Google ID
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    if (error.message && (error.message.includes("Token used too late") || error.message.includes("Token expired"))) {
        return res.status(401).send('Unauthorized: Token expired.');
    }
    // Log more specific audience errors if they occur
    if (error.message && error.message.includes("Wrong recipient")) {
        console.error(`Audience mismatch. Expected: ${GSI_CLIENT_ID}, Token audience: [Inspect token payload]`);
    }
    return res.status(401).send('Unauthorized: Token verification failed.');
  }
}

// Helper to convert Firestore Timestamps to ISO strings in an object
function convertTimestampsToISO(data) {
    if (!data) return data;
    const newData = { ...data };
    for (const key in newData) {
        if (newData[key] instanceof Timestamp) {
            newData[key] = newData[key].toDate().toISOString();
        } else if (newData[key] && typeof newData[key] === 'object' && !(newData[key] instanceof Array)) {
            // Recursively convert for nested objects if necessary, though not currently used for simple Firestore docs.
            // For this app, direct properties are usually Timestamps.
        }
    }
    return newData;
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
        vehiclesSnapshot.forEach(doc => vehicles.push(convertTimestampsToISO({ id: doc.id, ...doc.data() })));
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
        
        const snapshot = await docRef.get(); // Get the actual data with server timestamps resolved
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
      // Assuming vehicleId is passed as a URL parameter, e.g., /updateVehicle/:vehicleId
      const vehicleId = req.params.vehicleId || req.path.split('/').pop(); // Basic extraction if not using Express router params
      
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
        const vehicleRef = firestore
          .collection('users').doc(userId)
          .collection('vehicles').doc(vehicleId);
        await vehicleRef.update(vehicleDataToUpdate);
        console.log(`[CF:updateVehicle] Vehicle ${vehicleId} updated for user ${userId}`);
        
        const snapshot = await vehicleRef.get();
        res.status(200).json(convertTimestampsToISO({ id: snapshot.id, ...snapshot.data() }));

      } catch (error) {
        console.error(`[CF:updateVehicle] Error for user ${userId}, vehicle ${vehicleId}:`, error);
        if (error.code === 5) { 
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
      const vehicleId = req.params.vehicleId || req.path.split('/').pop();

      if (!vehicleId) return res.status(400).send('Bad Request: vehicleId is required in URL path.');

      try {
        const vehicleRef = firestore
          .collection('users').doc(userId)
          .collection('vehicles').doc(vehicleId);

        const batch = firestore.batch();
        
        const fuelingRecordsQuery = firestore.collection('users').doc(userId).collection('fuelingRecords').where('vehicleId', '==', vehicleId);
        const maintenanceRecordsQuery = firestore.collection('users').doc(userId).collection('maintenanceRecords').where('vehicleId', '==', vehicleId);
        
        const fuelingSnapshot = await fuelingRecordsQuery.get();
        fuelingSnapshot.forEach(doc => batch.delete(doc.ref));
        console.log(`[CF:deleteVehicle] Marked ${fuelingSnapshot.size} fueling records for deletion for vehicle ${vehicleId}.`);
        
        const maintenanceSnapshot = await maintenanceRecordsQuery.get();
        maintenanceSnapshot.forEach(doc => batch.delete(doc.ref));
        console.log(`[CF:deleteVehicle] Marked ${maintenanceSnapshot.size} maintenance records for deletion for vehicle ${vehicleId}.`);
        
        batch.delete(vehicleRef);
        
        await batch.commit();

        console.log(`[CF:deleteVehicle] Vehicle ${vehicleId} and associated records deleted for user ${userId}`);
        res.status(204).send();
      } catch (error) {
        console.error(`[CF:deleteVehicle] Error for user ${userId}, vehicle ${vehicleId}:`, error);
         if (error.code === 5) { 
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
          // Ensure user document is created with email if it doesn't exist
           const initialPrefs = { 
              activeVehicleId: null, 
              email: req.user.email || null, // Store email from token
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp()
            };
          await userDocRef.set(initialPrefs);
          console.log(`[CF:getUserPreferences] User document created for ${userId} with email ${req.user.email}`);
          return res.status(200).json({ activeVehicleId: null });
        }
        const preferences = userDoc.data();
        // If email is not in prefs, update it (for existing users prior to this change)
        if (!preferences.email && req.user.email) {
            await userDocRef.update({ email: req.user.email, updatedAt: FieldValue.serverTimestamp() });
            console.log(`[CF:getUserPreferences] Email updated for user ${userId}`);
        }
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
      const { activeVehicleId } = req.body; 

      if (typeof activeVehicleId === 'undefined') { // Allows activeVehicleId to be null
          return res.status(400).send('Bad Request: activeVehicleId key is required in the body (can be null).');
      }

      try {
        const userDocRef = firestore.collection('users').doc(userId);
        const dataToSet = { 
            activeVehicleId: activeVehicleId, // Will be null if passed as null
            updatedAt: FieldValue.serverTimestamp() 
        };
        // Ensure email is also present if it's the first time setting prefs
        const userDoc = await userDocRef.get();
        if (!userDoc.exists || !userDoc.data()?.email) {
            dataToSet.email = req.user.email || null;
            if (!userDoc.exists) {
                dataToSet.createdAt = FieldValue.serverTimestamp();
            }
        }

        await userDocRef.set(dataToSet, { merge: true });
        console.log(`[CF:setUserPreferences] Preferences updated for user ${userId}`);
        res.status(200).json({ activeVehicleId }); // Return the activeVehicleId that was set
      } catch (error) {
        console.error(`[CF:setUserPreferences] Error for user ${userId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};

// --- Fueling Record Functions ---

// Helper function to calculate kmPerLiter
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

  if (previousRecordsSnapshot.empty) {
    return null;
  }
  
  // Find the most recent valid predecessor, excluding the record itself if it's an update
  let previousRecordData = null;
  for (const doc of previousRecordsSnapshot.docs) {
      if (doc.id !== recordIdToExclude) {
          previousRecordData = doc.data();
          break; // Found the closest valid predecessor
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
          .orderBy('date', 'desc') // Dates are Timestamps, order correctly
          .orderBy('createdAt', 'desc') // Secondary sort for same-day entries
          .get();
        const records = [];
        recordsSnapshot.forEach(doc => records.push(convertTimestampsToISO({ id: doc.id, ...doc.data() })));
        console.log(`[CF:getFuelingRecords] Found ${records.length} records for user ${userId}, vehicle ${vehicleId}`);
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
      
      // Convert date string to Firestore Timestamp
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
        
        const docRef = await firestore
          .collection('users').doc(userId)
          .collection('fuelingRecords')
          .add(recordData);
        
        console.log(`[CF:addFuelingRecord] Record added with ID: ${docRef.id} for user ${userId}`);
        const snapshot = await docRef.get();
        res.status(201).json(convertTimestampsToISO({ id: snapshot.id, ...snapshot.data() }));
      } catch (error) {
        console.error(`[CF:addFuelingRecord] Error for user ${userId}:`, error);
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
        if (!doc.exists) {
            return res.status(404).send('Fueling record not found.');
        }
        // Use the existing vehicleId from the document to prevent accidental changes
        recordDataToUpdate.vehicleId = doc.data().vehicleId;

        recordDataToUpdate.kmPerLiter = await calculateKmPerLiterForRecord(userId, recordDataToUpdate.vehicleId, recordDataToUpdate, recordId);

        await recordRef.update(recordDataToUpdate);
        console.log(`[CF:updateFuelingRecord] Record ${recordId} updated for user ${userId}`);
        
        const snapshot = await recordRef.get();
        res.status(200).json(convertTimestampsToISO({ id: snapshot.id, ...snapshot.data() }));

      } catch (error) {
        console.error(`[CF:updateFuelingRecord] Error for user ${userId}, record ${recordId}:`, error);
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
        if (!doc.exists) {
            return res.status(404).send('Fueling record not found.');
        }
        
        await recordRef.delete();
        console.log(`[CF:deleteFuelingRecord] Record ${recordId} deleted for user ${userId}`);
        
        // Optional: Recalculate kmPerLiter for the record that immediately followed the deleted one,
        // if it was a full tank and its kmPerLiter depended on the deleted record.
        // This can be complex. For now, we're keeping it simple.

        res.status(204).send();
      } catch (error) {
        console.error(`[CF:deleteFuelingRecord] Error for user ${userId}, record ${recordId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};

// --- Maintenance Record Functions ---

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
        console.log(`[CF:getMaintenanceRecords] Found ${records.length} records for user ${userId}, vehicle ${vehicleId}`);
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
        const docRef = await firestore
          .collection('users').doc(userId)
          .collection('maintenanceRecords')
          .add(recordData);
        
        console.log(`[CF:addMaintenanceRecord] Record added with ID: ${docRef.id} for user ${userId}`);
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
        if (!doc.exists) {
            return res.status(404).send('Maintenance record not found.');
        }
        recordDataToUpdate.vehicleId = doc.data().vehicleId; // Keep existing vehicleId


        await recordRef.update(recordDataToUpdate);
        console.log(`[CF:updateMaintenanceRecord] Record ${recordId} updated for user ${userId}`);
        
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
        if (!doc.exists) {
            return res.status(404).send('Maintenance record not found.');
        }
        await recordRef.delete();
        console.log(`[CF:deleteMaintenanceRecord] Record ${recordId} deleted for user ${userId}`);
        res.status(204).send();
      } catch (error) {
        console.error(`[CF:deleteMaintenanceRecord] Error for user ${userId}, record ${recordId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};
