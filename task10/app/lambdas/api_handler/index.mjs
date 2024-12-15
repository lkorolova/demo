import {
    CognitoIdentityProviderClient,
    AdminCreateUserCommand,
    AdminRespondToAuthChallengeCommand,
    AdminInitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";
import {
    DynamoDBClient,
    ScanCommand,
    GetItemCommand,
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

function throwError(error) {
    throw {
        statusCode: 400,
        body: JSON.stringify(error),
    }
}

async function createUser(body) {
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

async function loginUser(body) {
    try {
        const { email, password } = body;

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

async function getAllTables() {
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
            body: JSON.stringify({
                tables: tables,
            }),
        }
    } catch (err) {
        console.log(err);
        throwError(err);
    }
}

async function postTable(body) {
    console.log(body);

    try {
        const { number, places, isVip, minOrder, id } = body;
        if (number && places && typeof isVip && id) {
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

async function getTable(tableId) {
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

        if (response.Item) {
            return {
                statusCode: 200,
                body: JSON.stringify(response.Item),
            }
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify("The table does not exist"),
            }
        }
    } catch (err) {
        console.log(err);
        throwError(err);
    }
}
async function getTableByNumber(tableNumber) {
    console.log("tableNumber", tableNumber);

    try {
        const input = {
            TableName: tables_table,
        }
        const scan = new ScanCommand(input);

        const response = await dynamo.send(scan);

        const isTableExising = response.Items.some((item) => item.number.N == tableNumber);

        if (isTableExising) {
            return {
                statusCode: 200,
                body: JSON.stringify(response.Item),
            }
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify("The table does not exist"),
            }
        }
    } catch (err) {
        console.log(err);
        throwError(err);
    }
}

function isBookedAlready(earlyReservations, currentReservation) {

    console.log('early', earlyReservations);
    console.log('cur', currentReservation);
    
    const results = [];

    const curResStart = currentReservation.slotTimeStart;
    const curResEnd = currentReservation.slotTimeEnd;
    earlyReservations.forEach((earlyReservation) => {
        const previousResStart = earlyReservation.slotTimeStart;
        const previousResEnd = earlyReservation.slotTimeEnd;
        
        const isBooked =
            (curResEnd > previousResStart && curResStart < previousResStart) ||
            (previousResEnd > curResStart && previousResStart < curResStart) ||
            (previousResStart >= curResStart && previousResEnd <= curResEnd) ||
            (previousResStart <= curResStart && previousResEnd >= curResEnd)
        results.push(isBooked);
    }
    );    

    return results.includes(true);
}

async function getTableReservations(tableId, date) {
    console.log("tableId", tableId);

    try {
        const input = {
            TableName: reservations_table,
            Key: {
                tableNumber: +tableId,
                date: date,
            },
        }
        const scan = new ScanCommand(input);

        const response = await dynamo.send(scan);
        const reservations = [];

        response.Items.forEach((reservation) => {
            const reservationParams = {
                tableNumber: +reservation.tableNumber.N,
                clientName: reservation.clientName.S,
                phoneNumber: reservation.phoneNumber.S,
                date: reservation.date.S,
                slotTimeStart: reservation.slotTimeStart.S,
                slotTimeEnd: reservation.slotTimeEnd.S,
            }
            reservations.push(reservationParams);
        })

        return reservations;
    } catch (err) {
        console(err);
        throwError(err);
    }
}

async function doesTableExist(tableNumber) {
    const result = await getTableByNumber(tableNumber);
    if (result.statusCode === 200) {
        return true;
    } else {
        return false;
    }
}

async function postReservation(body) {
    try {
        console.log("body", body);

        const {
            tableNumber,
            clientName,
            phoneNumber,
            date,
            slotTimeStart,
            slotTimeEnd
        } = body;
        if (tableNumber && clientName && phoneNumber && date && slotTimeStart && slotTimeEnd) {
            const doesCurrentTableExist = await doesTableExist(tableNumber);
            console.log(doesCurrentTableExist);

            if (!doesCurrentTableExist) {
                throw {
                    statusCode: 400,
                    body: JSON.stringify("The table does not exist"),
                }
            }
            const existingTableReservations = await getTableReservations(tableNumber, date);
            const id = v4();
            const input = {
                TableName: reservations_table,
                Item: {
                    id: id,
                    tableNumber: tableNumber,
                    clientName: clientName,
                    phoneNumber: phoneNumber,
                    date: date,
                    slotTimeStart: slotTimeStart,
                    slotTimeEnd: slotTimeEnd,
                }
            }
            if (isBookedAlready(existingTableReservations, input.Item)) {
                throw {
                    statusCode: 400,
                    body: "The table has already been booked for this time",
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

async function getAllReservations() {
    try {
        const input = {
            TableName: reservations_table,
        }
        const scan = new ScanCommand(input);

        const response = await dynamo.send(scan);
        const reservationsObj = { reservations: [], };

        response.Items.forEach((reservation) => {
            const tableParams = {
                reservationId: reservation.id.S,
                tableNumber: +reservation.tableNumber.N,
                clientName: reservation.clientName.S,
                phoneNumber: reservation.phoneNumber.S,
                date: reservation.date.S,
                slotTimeStart: reservation.slotTimeStart.S,
                slotTimeEnd: reservation.slotTimeEnd.S,
            }
            reservationsObj.reservations.push(tableParams);
        })

        return {
            statusCode: 200,
            body: JSON.stringify(reservationsObj),
        }
    } catch (err) {
        console.log(err);
        throwError(err);
    }
}

