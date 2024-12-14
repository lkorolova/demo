import { 
    CognitoIdentityProviderClient, 
    AdminCreateUserCommand, 
    AdminRespondToAuthChallengeCommand,
    AdminInitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { 
    DynamoDBClient, 
    ScanCommand,
    // PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { 
    GetCommand,
    PutCommand, 
    DynamoDBDocumentClient 
} from "@aws-sdk/lib-dynamodb";
import { v4 } from 'uuid';
const USER_POOL_ID = process.env.cup_id;
const CLIENT_ID = process.env.cup_client_id;
const cognito = new CognitoIdentityProviderClient({ region: process.env.region });
const tables_table = process.env.tables_table;
const reservations_table = process.env.reservations_table;
const dynamo = new DynamoDBClient({});
const dynamoDoc = DynamoDBDocumentClient.from(dynamo);

const createUser = async (body) => {
    try {
        const { firstName, lastName, email, password } = body;

        const createUserInput = {
            UserPoolId: USER_POOL_ID,
            ClientId: CLIENT_ID,
            Username: email,
            TemporaryPassword: password,
            MessageAction: "SUPPRESS",
            UserAttributes: [
                {
                    Name: "name",
                    Value: firstName,
                },
                {
                    Name: "family_name",
                    Value: lastName,
                },
                {
                    Name: "email",
                    Value: email,
                },
            ],
        };

        const command = new AdminCreateUserCommand(createUserInput);

        await cognito.send(command);
        
        const initAuthInput = {
            UserPoolId: USER_POOL_ID,
            ClientId: CLIENT_ID, 
            AuthFlow: "ADMIN_NO_SRP_AUTH",
            AuthParameters: { 
                USERNAME: email,
                PASSWORD: password,
            }
        }
        const initAuthCommand = new AdminInitiateAuthCommand(initAuthInput);
        const response = await cognito.send(initAuthCommand);
        const inputChallenge = {
            UserPoolId: USER_POOL_ID,
            ClientId: CLIENT_ID,
            ChallengeName: "NEW_PASSWORD_REQUIRED",
            Session: response.Session,
            ChallengeResponses: {
                NEW_PASSWORD: password,
                USERNAME: email,
            }
        }
        const commandChallenge = new AdminRespondToAuthChallengeCommand(inputChallenge);
        await cognito.send(commandChallenge);

        return {
            statusCode: 200,
            body: "Successful Sign Up",
        }
    } catch (error) {
        console.log(error);
        throwError(error);
    }
}

const loginUser = async (body) => {    
    try {
        const {email, password} = body;   
        
        const initAuthInput = {
            UserPoolId: USER_POOL_ID,
            ClientId: CLIENT_ID, 
            AuthFlow: "ADMIN_NO_SRP_AUTH",
            AuthParameters: { 
                USERNAME: email,
                PASSWORD: password,
            }
        }
        const initAuthCommand = new AdminInitiateAuthCommand(initAuthInput);
        const response = await cognito.send(initAuthCommand);
                
        return {
            statusCode: 200,
            body: JSON.stringify({
                accessToken: response.AuthenticationResult.IdToken,
            }),
        }
    } catch (err) {
        console.log(err);
        throwError(err);
    }
}

const getAllTables = async () => {
    try {
        const input = {
            TableName: tables_table,
        }
        const scan = new ScanCommand(input);

        const response = await dynamo.send(scan);
        const tables = [];

        response.Items.forEach((table) => {
            const tableParams = {
                id: +table.id.N,
                number: +table.number.N,
                places: +table.places.N,
                isVip: table.isVip.BOOL,
                minOrder: +table.minOrder?.N,
            }
            tables.push(tableParams);
        })

        return {
            statusCode: 200,
            body: JSON.stringify(tables),
        }
    } catch (err) {
        console.log(err);
        throwError(err);
    }
}

const postTable = async (body) => {
    console.log(body);
    
    try {
        const { number, places, isVip, minOrder, id} = body;
        if(number && places && typeof isVip && id) {            
            const input = {
                TableName: tables_table,
                Item: {
                    id: id,
                    number: number,
                    places: places,
                    isVip: isVip,
                    minOrder: minOrder || null,
                }
            }
            
            console.log("input", input);
            
            
            const put = new PutCommand(input);
            console.log("put", put);
            
            await dynamoDoc.send(put);
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    id: id
                }),
    
            }
        } else {
            throw {
                statusCode: 400,
                body: JSON.stringify("Bad request"),
            }        
        }
    } catch (err) {
        console.log(err);
        throwError(err);
    }
}

const getTable = async (tableId) => {    
    console.log("tableId", tableId);
    
    try {
        const input = {
            TableName: tables_table,
            Key: {
                id: +tableId,
            },
        } 
        const getCommand = new GetCommand(input);
        const response = await dynamoDoc.send(getCommand);

        return {
            statusCode: 200,
            body: JSON.stringify(response.Item),
        }
    } catch (err) {
        console(err);
        throwError(err);
    }
}

const postReservation = async (body) => {
    try {
        console.log("body", body);
        
        const { 
            tableNumber,
            clientName,
            phoneNumber,
            date,
            slotTimeStart,
            slotTimeEnd
        } =  body;
        if (tableNumber && clientName && phoneNumber && date && slotTimeStart && slotTimeEnd) {
            const id = v4();
            const input = {
                TableName: reservations_table,
                Item: {
                    reservationId: id,
                    tableNumber: tableNumber,
                    clientName: clientName,
                    phoneNumber: phoneNumber,
                    date: date,
                    slotTimeStart: slotTimeStart,
                    slotTimeEnd: slotTimeEnd,
                }  
            }
            const put = new PutCommand(input);
            await dynamoDoc.send(put);
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    reservationId: id,
                })
            }
        } else {
            throw {
                statusCode: 400,
                body: JSON.stringify("Bad request"),
            }        
        }
    } catch (err) {
        console.log(err);
        throwError(err);
    }
}

const getAllReservations = async () => {
    try {
        const input = {
            TableName: reservations_table,
        }
        const scan = new ScanCommand(input);

        const response = await dynamo.send(scan);
        const reservations = [];

        response.Items.forEach((reservation) => {
            const tableParams = {
                reservationId: reservation.reservationId.S,
                tableNumber: +reservation.tableNumber.N,
                clientName: reservation.clientName.S,
                phoneNumber: reservation.phoneNumber.S,
                date: reservation.date.S,
                slotTimeStart: reservation.slotTimeStart.S,
                slotTimeEnd: reservation.slotTimeEnd.S,
            }
            reservations.push(tableParams);
        })

        return {
            statusCode: 200,
            body: JSON.stringify(reservations),
        }
    } catch (err) {
        console.log(err);
        throwError(err);
    }
}


export const handler = async (event) => {
    const method = event.httpMethod || null;

    if (method) {
        try {
            const path = event.resource;
            const requestBody = JSON.parse(event.body);            

            if (path === "/signup" && method === "POST") {
                console.log("signup");
                
                return await createUser(requestBody);
            }
            if (path === "/signin" && method === "POST") {
                console.log("signin");

                return await loginUser(requestBody);
            }
            if (path === "/tables" && method === "POST") {
                console.log("tables POST");
                
                return await postTable(requestBody);
            }
            if (path === "/tables" && method === "GET") {
                console.log("tables GET");

                return await getAllTables();
            }
            if (path === "/tables/{tableId}" && method === "GET") {
                console.log("tables/{tableId} GET");
                
                return await getTable(event.pathParameters.tableId);
            }
            if (path === "/reservations" && method === "POST") {
                console.log("reservations POST");

                return await postReservation(requestBody);
            }
            if (path === "/reservations" && method === "GET") {
                console.log("reservations GET");

                return await getAllReservations();
            }

            // Default return if no method or path exists
            return {
                statusCode: 400,
                body: "Bad Request",
            }

        } catch (err) {
            console.log(err);
            
            return {
                statusCode: 400,
                body: "Bad Request",
            }
        }
    } else {
        return {
            statusCode: 400,
            body: "Bad Request",
        }
    }
}

function throwError (error) {
    throw {
        statusCode: 400,
        body: JSON.stringify(error),
    }
}
