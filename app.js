// https://github.com/vpulim/node-soap
const soap = require('soap');
const mqtt = require('mqtt');

var mqttClient;

// At the bottom of the wsdl file you will find the http address of the service
var prodWSDL = '/plex-pro.wsdl';
var testWSDL = '/plex-test.wsdl';

var AvillaUser = 'BuscheAvillaKorsws@plex.com';
var AvllaPassword = '5b11b45-f59f-';

var AlbionUser = 'BuscheAlbionWs2@plex.com';
var AlbionPassword = '6afff48-ba19-';

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
  if (ProdServer) plexWSDL = __dirname + prodWSDL;
  else plexWSDL = __dirname + testWSDL;

  var BAS;
  if ('Albion' == PCN) {
    BAS = new soap.BasicAuthSecurity(AlbionUser, AlbionPassword);
  } else if ('Avilla' == PCN) {
    BAS = new soap.BasicAuthSecurity(AvillaUser, AvllaPassword);
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
        // console.log(res[i].Columns.Column[7].Name + ": " + res[i].Columns.Column[7].Value);
        for (let j = 0; j < container.length; j++) {
          // console.log(container[j].Name + ': ' + container[j].Value);
          let name = container[j].Name;
          setupContainer[name] = container[j].Value;
          //            console.log(setupContainer);
        }
        debugger;
        setupContainer['TransDate'] = TransDate;
        setupContainer['ProdServer'] = ProdServer;
        setupContainer['PCN'] = PCN;
        setupContainer['Cycle_Counter_Shift_SL'] = Cycle_Counter_Shift_SL;
        // Ready javascript object for transport
        let msgString = JSON.stringify(setupContainer);
        console.log(setupContainer);

        mqttClient.publish('Plex13318', msgString);
        setupContainer = {};
      }
    });
  });
}

function main() {
  mqttClient = mqtt.connect(
    'mqtt://ec2-3-15-151-115.us-east-2.compute.amazonaws.com',
    // 'mqtt://test.mosquitto.org'
    // 'mqtt://localhost',
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
    let Cycle_Counter_Shift_SL = obj.Cycle_Counter_Shift_SL;
    console.log(message.toString());
    let date_ob = new Date();
    let date = ('0' + date_ob.getDate()).slice(-2);
    let month = ('0' + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    let hours = date_ob.getHours();
    let minutes = date_ob.getMinutes();
    let seconds = date_ob.getSeconds();
    let TransDate = `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
    getSetupContainers(
      TransDate,
      PCN,
      true,
      WorkCenter,
      Cycle_Counter_Shift_SL,
    );
    getSetupContainers(
      TransDate,
      PCN,
      false,
      WorkCenter,
      Cycle_Counter_Shift_SL,
    );
  });
}
main();
