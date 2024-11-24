function ourRequest(event) {
    return new Promise(function (resolve, reject) {
        let response = {};
    
        if (event &&
            event.requestContext &&
            event.requestContext.http
        ) {
            const http = event.requestContext.http;
            const path = http.path;
            const method = http.method;
            
            if(path === "/hello" && method === "GET") {
                response = {
                    "statusCode": 200,
                    "message": "Hello from Lambda",
                }
                resolve(JSON.stringify(response));
            } else {
                response = {
                    "statusCode": 400,
                    "message": `Bad request syntax or unsupported method. Request path: ${path}. HTTP method: ${method}`,
                }
                resolve(JSON.stringify(response));
            }
        } else {
            response = {
                "statusCode": 200
            }
            resolve(JSON.stringify(response));
        }
    });
}

exports.handler = async function (event) {
    const req = await ourRequest(event);

    return req;
};  
