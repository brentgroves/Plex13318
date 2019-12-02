// https://github.com/vpulim/node-soap
const soap = require('soap');
const mqtt = require('mqtt');
const config = require('../Config13318/config.json');

var mqttClient;

// At the bottom of the wsdl file you will find the http address of the service

// CNC422
// WorkcenterGroup/WorkCenter
// GA FWD Knuckle/FWD BE 517
// Plex Workcenter: 61420

async function getSetupContainers(TransDate, PCN, ProdServer, Workcenter, CNC) {
  if (ProdServer) plexWSDL = config.ProdWSDL;
  else plexWSDL = config.TestWSDL;

  var BAS;
  if ('Albion' == PCN) {
    BAS = new soap.BasicAuthSecurity(config.AlbionUser, config.AlbionPassword);
  } else if ('Avilla' == PCN) {
    BAS = new soap.BasicAuthSecurity(config.AvillaUser, config.AvillaPassword);
  }

  soap.createClient(plexWSDL, function(err, client) {
    // we now have a soapClient - we also need to make sure there's no `err` here.
    if (err) {
      return client.status(500).json(err);
    }

    client.setSecurity(BAS);
    debugger;
    var request_data = {
      ExecuteDataSourceRequest: {
        DataSourceKey: '13318',
        InputParameters: {
          InputParameter: {
            Name: 'Workcenter_Key',
            Value: `${Workcenter}`,
            Required: 'true',
            Output: 'false',
          },
        },
      },
    };
    client.ExecuteDataSource(request_data, function(err, result) {
      // we now have a soapClient - we also need to make sure there's no `err` here.
      if (err) {
        return result.status(500).json(err);
      }

      var res = result.ExecuteDataSourceResult.ResultSets.ResultSet[0].Rows.Row;
      var setupContainer = {};
      for (let i = 0; i < res.length; i++) {
        let container = res[i].Columns.Column;
        for (let j = 0; j < container.length; j++) {
          let name = container[j].Name;
          setupContainer[name] = container[j].Value;
        }
        debugger;
        setupContainer['TransDate'] = TransDate;
        setupContainer['Workcenter'] = Workcenter;
        setupContainer['CNC'] = CNC;
        setupContainer['ProdServer'] = ProdServer;
        setupContainer['PCN'] = PCN;
        // Ready javascript object for transport
        let msgString = JSON.stringify(setupContainer);

        console.log(msgString);

        mqttClient.publish('Plex13318', msgString);
        setupContainer = {};
      }
    });
  });
}

function main() {
  //Test
  var testDate = '2019-12-15 09:00'
  getSetupContainers(testDate, 'Avilla', true, '61420','422');
  getSetupContainers(testDate, 'Avilla', false, '61420','422');
  mqttClient = mqtt.connect(config.MQTT);

  mqttClient.on('connect', function() {
    mqttClient.subscribe('Alarm13318-1', function(err) {
      if (!err) {
        console.log('subscribed to: Alarm13318-1');
      }
    });
  });
  // message is a buffer
  // mqttClient.on('message', function(topic, message) {
  //   const obj = JSON.parse(message.toString()); // payload is a buffer
  //   for (let i = 0; i < config.NodeId.length; i++) {
  //     let PCN = config.NodeId[i].PCN;
  //     let WorkCenter = config.NodeId[i].WorkCenter;
  //     let CNC = config.NodeId[i].CNC;
  //     let TransDate = obj.TransDate;
  //     getSetupContainers(TransDate, PCN, true, WorkCenter);
  //     getSetupContainers(TransDate, PCN, false, WorkCenter);
  //   }
  // });
}
main();
