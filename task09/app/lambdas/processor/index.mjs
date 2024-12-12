import axios from "axios";
const url = process.env.url;
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 } from 'uuid';

const tableName = process.env.target_table;


export const handler = async (event) => {
    const request = new RequestHandler();
    const data = await request.getReq(url);    

    const res = await putToDynamoDB(data, tableName);
    
    return res;
};

async function putToDynamoDB(data, dbName) {
    const id = v4();
    const client = new DynamoDBClient({});
    const dynamo = DynamoDBDocumentClient.from(client);
    const command = new PutCommand({
        TableName: dbName,
        Item: {
            id: id,
            "forecast": {
                "elevation": data.elevation,
                "generationtime_ms": data.generationtime_ms,
                "hourly": {
                    "temperature_2m": data.hourly.temperature_2m,
                    "time": data.hourly.time,
                },
                "hourly_units": {
                    "temperature_2m": data.hourly_units.temperature_2m,
                    "time": data.hourly_units.time
                 },
                 "latitude": data.latitude,
                 "longitude": data.longitude,
                 "timezone": data.timezone,
                 "timezone_abbreviation": data.timezone_abbreviation,
                 "utc_offset_seconds": data.utc_offset_seconds,
            }
        }
    });

    let response;
    try {
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
    return response;
}
    
class RequestHandler {
    constructor () {}
    getReq(url) {
        return axios
        .get(url)
        .then(data => {                
            return data.data;
        })
        .catch(err => console.log(err));
    }
}
                    