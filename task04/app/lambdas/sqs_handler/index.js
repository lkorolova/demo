exports.handler = async (event) => {
    for (const message of event.Records) {
      await processMessageAsync(message);
    }
    console.info("processed");
  };
  
  async function processMessageAsync(message) {
    try {
      console.log(message.body);
      await Promise.resolve(message);
    } catch (err) {
      console.error("An error occurred");
      throw err;
    }
  }
  
  