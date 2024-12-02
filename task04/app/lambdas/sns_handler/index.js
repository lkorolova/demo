exports.handler = async (event) => {
    for (const record of event.Records) {
      await processMessageAsync(record);
    }
    console.info("done");
  };
  
  async function processMessageAsync(record) {
    try {
      const message = JSON.stringify(record.Sns.Message);
      console.log(`Processed message ${message}`);
      await Promise.resolve(message);
    } catch (err) {
      console.error("An error occurred");
      throw err;
    }
  }