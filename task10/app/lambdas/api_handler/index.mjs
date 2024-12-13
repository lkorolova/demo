import { CognitoIdentityProviderClient, AdminCreateUserCommand } from "@aws-sdk/client-cognito-identity-provider";
const USER_POOL_ID = process.env.cup_id;
const CLIENT_ID = process.env.cup_client_id;

const createUser = (body) => {
    console.log('startd creating user');

    try {
        console.log('trying creating user');
        const { firstName, lastName, email, password } = body;
        console.log('with values', firstName, lastName, email, password);

        const input = {
            UserPoolId: USER_POOL_ID,
            СlientId: CLIENT_ID,
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

        console.log('and other values', input);
        console.log('creating client');

        const client = new CognitoIdentityProviderClient({ region: process.env.region });
        console.log('creating command');
        const command = new AdminCreateUserCommand(input);

        console.log('success sign up');
        return client.send(command);
    } catch (error) {
        console.log('catch', error);
        return new Promise.reject(error);
    }
}


export const handler = async (event) => {
    if (event.httpMethod) {
        console.log('http');

        try {
            const path = event.path;
            const method = event.httpMethod;
            const requestBody = JSON.parse(event.body);

            if (path === '/signup' && method === 'POST') {
                console.log('send request');
                console.log('body', requestBody);

                await createUser(requestBody);

                console.log('success');
                return JSON.stringify({
                    statusCode: 200
                })
            }


        } catch (err) {
            console.log("resultMain: error", err);
            return JSON.stringify({ error: err });
        }
    } else {
        return JSON.stringify({ code: 'Not HTTP' })
    }
}
