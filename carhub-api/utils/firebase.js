const { Firestore, FieldValue, Timestamp } = require('@google-cloud/firestore');
const firestore = new Firestore();
module.exports = { firestore, FieldValue, Timestamp };
