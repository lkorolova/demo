const axios = require('axios');
const url = process.env.url

exports.handler = async (event) => {    
    const request = new RequestHandler();

    const response = await request.getReq(url);

    return response;
};

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
