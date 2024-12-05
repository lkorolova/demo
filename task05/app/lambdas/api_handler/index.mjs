import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { uuid } from 'uuidv4'

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const tableName = process.env.target_table || "Events";

const ourRequest = async (event) => {
      let response = {};

      try {
        const id = uuid();
        const date = new Date(Date.now()).toISOString();
        const { principalId, content} = event;        
        
        if(typeof +principalId === "number") {
          const command = new PutCommand({
            TableName: tableName,
            Item: {
              id: id,
              principalId: principalId,
              createdAt: date,
              body: content,
            },
          });
  
          await dynamo.send(command);          
  
          response = {
              "statusCode": 201,
              "event": {
                "id": id,
                "principalId": principalId, 
                "createdAt": date,
                "body": content,
            },
          }
        }
      } catch (err) {
        response = {
            "statusCode": 400,
            "message": err,
        }
      }
      return response;
}


export const handler = async (event) => {
  const res = ourRequest(event);
  
  return res;
};
