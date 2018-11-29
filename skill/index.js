/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const https = require('https');
const xmlToJson = require('xml2js');
const parser = new xmlToJson.Parser();

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
	  
		const attributesManager = handlerInput.attributesManager;
		const attributes = await attributesManager.getPersistentAttributes() || {};
		if (Object.keys(attributes).length === 0) 
		{
			return handlerInput.responseBuilder
			.speak('Ciao! Configura una fermata. Successivamente ti basterà dire Alexa lancia amico bus. Se non conosci il numero della tua fermata, cercalo online sulla pagina della skill. Configura subito una fermata dicendo ad esempio imposta la fermata 10029')
      .withShouldEndSession(false)
			.getResponse();
		} 
		else 
		{
			var poostRequestData = `fermata=${attributes.busStop.toString()}&linea=&oraHHMM=`;
			var poostRequestArguments = {
				host: 'hellobuswsweb.tper.it',
				path: '/web-services/hello-bus.asmx/QueryHellobus',
				method: 'POST',
				headers: {
				  'Content-Type': 'application/x-www-form-urlencoded',
				  'Content-Length': poostRequestData.length
				}
			};
			let response = await doRequest(poostRequestArguments, poostRequestData);
		  
		  return handlerInput.responseBuilder
			.speak(response)
      .getResponse();		
		}
	},
};

const BusStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'BusStopIntent';
  },
  async handle(handlerInput) {

	var busStop = handlerInput.requestEnvelope.request.intent.slots.busStop.value;
    var attributesManager = handlerInput.attributesManager;
    var responseBuilder = handlerInput.responseBuilder;
    var attributes = await attributesManager.getPersistentAttributes() || {};
	attributes.busStop = busStop;
	attributesManager.setPersistentAttributes(attributes);
	await attributesManager.savePersistentAttributes();
	var speechText = `Ho salvato la fermata ${attributes.busStop.toString()}.`;

    return responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'Trova online sulla pagina della skill il numero corrispondente alla tua fermata. Configura subito una fermata dicendo ad esempio imposta la fermata 10029';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(false)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'A presto!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Mi dispiace. Non sono riuscita a capire cosa mi hai chiesto. Puoi ripetere?')
      .reprompt('Mi dispiace. Non sono riuscita a capire cosa mi hai chiesto. Puoi ripetere?')
      .getResponse();
  },
};

/* Utils Functions */

async function doRequest(requestArguments, dataToSend) {
	const xmlResponseItem = 'string';
	const tperResponseHeader = "TperHellobus: ";
	//const tperResponseDetails = "BUS CON PEDANA";
	
	return new Promise ((resolve, reject) => {
		
		var postRequest = https.request(requestArguments, function(response) {
			var responseString = "";
			response.setEncoding('utf8');
			
			response.on('data', function (responseData) {
				parser.parseString(responseData, function (err, result) {
					responseString = result[xmlResponseItem]['_'].replace(tperResponseHeader, "");
					//responseString = responseString.replace(tperResponseDetails, "");
					console.log(responseString);
				});
			});
			
			response.on('error', err => {
				console.log("Error message: " + err.message);
				reject(err);
			});
			
			response.on('end', () => {
				console.log('Answer: ');
				resolve(responseString);
			});
		});
	
		postRequest.write(dataToSend);
		postRequest.end();
	}); 
}

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    BusStopIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName('alexa-data')
  .withAutoCreateTable(true)
  .lambda();