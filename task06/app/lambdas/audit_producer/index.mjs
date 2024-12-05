import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { uuid } from 'uuidv4';


const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const tableName = process.env.target_table || "Audit";
const MILISECS_IN_SEC = 1000;

export const handler = async (event) => {
    if (event) {
        let res;
        event.Records.forEach(record => {
            res = logDynamoDBRecord(record);
        });
        return res;
    }
};

const logDynamoDBRecord = async (record) => {

    console.log("record: ", record);
    

    let response;
    try {
        const id = uuid();
        const modificationTime = new Date(record.dynamodb.ApproximateCreationDateTime * MILISECS_IN_SEC);
        const modificationTimeStr = modificationTime.toISOString();
        const key = record.dynamodb.NewImage.key.S;
        const newValue = record.dynamodb.NewImage.value.N;
        
        let command;
        if(record.eventName === "INSERT") {

            command = new PutCommand({
                TableName: tableName,
                Item: {
                    "id": id,
                    "itemKey": key,
                    "modificationTime": modificationTimeStr,
                    "newValue": {
                        "key": key,
                        "value": newValue,
                    },
                } ,
            });
        } else if (record.eventName === "MODIFY") {
            const oldValue = record.dynamodb.OldImage.value.S;

            command = new PutCommand({
                TableName: tableName,
                Item: {
                    "id": id,
                    "itemKey": key,
                    "modificationTime": modificationTimeStr,
                    "updatedAttribute": "value",
                    "oldValue": oldValue,
                    "newValue": newValue,
                } ,
            });
        }
        
        await dynamo.send(command);
        
        response = {
            statusCode: 200,
            message: "Success",
        }
    } catch (err) {
        response = {
            statusCode: 400,
            message: err,
        }
    }
    
    console.log(response);
    
    return response;
};  
