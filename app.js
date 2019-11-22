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

async function getSetupContainers(
  TransDate,
  PCN,
  ProdServer,
  WorkCenter,
  Cycle_Counter_Shift_SL,
) {
  if (ProdServer) plexWSDL = config.ProdWSDL;
  else plexWSDL = config.TestWSDL;

  var BAS;
  if ('Albion' == PCN) {
    BAS = new soap.BasicAuthSecurity(config.AlbionUser, config.AlbionPassword);
  } else if ('Avilla' == PCN) {
    BAS = new soap.BasicAuthSecurity(config.AvillaUser, config.AvillaPassword);
  }

  console.log(plexWSDL);
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
            Value: `${WorkCenter}`,
            Required: 'true',
            Output: 'false',
          },
        },
      },
    };
    client.ExecuteDataSource(request_data, function(err, result) {
      // we now have a soapClient - we also need to make sure there's no `err` here.
      if (err) {
        return res.status(500).json(err);
      }

      console.log(
        result.ExecuteDataSourceResult.ResultSets.ResultSet[0].Rows.Row[0]
          .Columns.Column[0].Name,
      );

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
        setupContainer['ProdServer'] = ProdServer;
        setupContainer['PCN'] = PCN;
        setupContainer['Cycle_Counter_Shift_SL'] = Cycle_Counter_Shift_SL;
        // Ready javascript object for transport
        let msgString = JSON.stringify(setupContainer);

        //console.log(setupContainer);

        mqttClient.publish('Plex13318', msgString);
        setupContainer = {};
      }
    });
  });
}

function main() {
  mqttClient = mqtt.connect(
      config.MQTT
  );

  mqttClient.on('connect', function() {
    mqttClient.subscribe('Kep13318', function(err) {
      if (!err) {
        console.log('subscribed to: Kep13318');
      }
    });
  });
  // message is a buffer
  mqttClient.on('message', function(topic, message) {
    const obj = JSON.parse(message.toString()); // payload is a buffer
    let PCN = obj.PCN;
    let WorkCenter = obj.WorkCenter;
    let TransDate = obj.TransDate;
    let Cycle_Counter_Shift_SL = obj.Cycle_Counter_Shift_SL;
    console.log(message.toString());
    getSetupContainers(
      TransDate,
      PCN,
      true,
      WorkCenter,
      Cycle_Counter_Shift_SL,
    );
    /*
    getSetupContainers(
      TransDate,
      PCN,
      false,
      WorkCenter,
      Cycle_Counter_Shift_SL,
    );
    */
  });
}
main();
