const cors = require('cors')({ origin: true });
const { firestore, FieldValue } = require('../utils/firebase');
const { authenticateToken } = require('../utils/auth');

exports.getUserPreferences = (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
    authenticateToken(req, res, async () => {
      const userId = req.user.uid;
      try {
        const userDocRef = firestore.collection('users').doc(userId);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
          const initialPrefs = {
            activeVehicleId: null,
            email: req.user.email || null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };
          await userDocRef.set(initialPrefs);
          return res.status(200).json({ activeVehicleId: null });
        }
        const preferences = userDoc.data();
        if (!preferences.email && req.user.email) {
          await userDocRef.update({ email: req.user.email, updatedAt: FieldValue.serverTimestamp() });
        }
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
      if (typeof activeVehicleId === 'undefined') {
        return res.status(400).send('Bad Request: activeVehicleId key is required in the body (can be null).');
      }
      try {
        const userDocRef = firestore.collection('users').doc(userId);
        const dataToSet = {
          activeVehicleId,
          updatedAt: FieldValue.serverTimestamp(),
        };
        const userDoc = await userDocRef.get();
        if (!userDoc.exists || !userDoc.data()?.email) {
          dataToSet.email = req.user.email || null;
          if (!userDoc.exists) dataToSet.createdAt = FieldValue.serverTimestamp();
        }
        await userDocRef.set(dataToSet, { merge: true });
        res.status(200).json({ activeVehicleId });
      } catch (error) {
        console.error(`[CF:setUserPreferences] Error for user ${userId}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  });
};
