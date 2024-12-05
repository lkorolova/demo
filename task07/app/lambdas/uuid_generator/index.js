const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const prefix = "cmtr-02649c70-";
const suffix = "-test";

exports.handler = async (event) => {
    const uuid = AWS.util.uuid.v4;
    
    const execTime = new Date(Date.now());
    const fileName = execTime.toISOString();

    const idList = { ids: []}; 
    for (let i=0; i < 10; i++) {
        idList.ids.push(uuid());
    }    
    
    const params = {
        Bucket : `${prefix}uuid-storage${suffix}`,
        Key : fileName,
        Body : JSON.stringify(idList),
        ContentType: "application/json"
    }
    console.log("params: ", params);
    try {
        const data = await s3.putObject(params).promise();
        console.log('Success');
        console.log("data: ", data);
        return;
      } catch (err) {
        console.log(err);
        throw err;
      }
}
