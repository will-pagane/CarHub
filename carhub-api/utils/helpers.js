function convertTimestampsToISO(data) {
  if (!data) return data;
  const newData = { ...data };
  for (const key in newData) {
    if (newData[key] && typeof newData[key].toDate === 'function') {
      newData[key] = newData[key].toDate().toISOString();
    }
  }
  return newData;
}

module.exports = { convertTimestampsToISO };
