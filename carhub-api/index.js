const { firestore } = require('./utils/firebase'); // ensures Firestore initialized
const { authenticateToken } = require('./utils/auth'); // for modules that may want it
const { convertTimestampsToISO } = require('./utils/helpers');

module.exports = {
  ...require('./routes/vehicles'),
  ...require('./routes/userPreferences'),
  ...require('./routes/fuelingRecords'),
  ...require('./routes/maintenanceRecords'),
};
