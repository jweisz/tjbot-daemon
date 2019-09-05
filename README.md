# tjbot-daemon

> Node.js daemon for interacting with TJBot via Bluetooth Low Energy

This project is used to enable TJBot to listen for commands via Bluetooth Low Energy (BLE). It is used in conjunction with the [TJBot Swift Playground](http://github.com/jweisz/tjbot-playground).

# Installation

You can install this daemon directly to your TJBot by running the following command:

```
curl -sL https://ibm.biz/tjbot-daemon | sh -
```

This script will install additional software packages needed for the daemon, clone the `tjbot-daemon` project to your TJBot, generate a skeleton configuration file, and ask whether you want to launch the daemon whenever your TJBot starts up.

# Usage

The common usage case for the daemon is in conjunction with the [TJBot Swift Playground](http://github.com/jweisz/tjbot-playground). When using the Playground, please ensure the daemon is running on your TJBot at the same time. You can manually run the daemon as follows:

```
cd ~/Desktop/tjbot-daemon
sudo node tjbot-daemon.js
```

> This command assumes the `tjbot-daemon` project was cloned to your Desktop. Please update the command if you have cloned it to a different location.

> Note that you must use `sudo` to run the daemon, as it needs root permissions to control TJBot’s LED.

# TJBot Bluetooth LE API

If you would like to write your own applications that communicate with TJBot via Bluetooth, please see the following documentation.

## Services

`tjbot-daemon` defines two top-level BLE services.

| **Service** | **UUID** |
|---|---|
| Configuration | 799d5f0d-0001-0000-a6a2-da053e2a640a |
| Command | 799d5f0d-0002-0000-a6a2-da053e2a640a |

## Configuration Service

The Configuration service used to receive configuration information about the TJBot. It is comprised of the following characteristics.

| **Characteristic** | **UUID** | **Properties** |
|---|---|---|
| Configuration | 799d5f0d-0001-0001-a6a2-da053e2a640a | read |
| Hardware | 799d5f0d-0001-0002-a6a2-da053e2a640a | read |
| Capability | 799d5f0d-0001-0003-a6a2-da053e2a640a | read |

### Configuration Characteristic

The Configuration characteristic returns a JSON-encoded object with the configuration of the TJBot.

**Sample:**

```
{"name":"tinker"}
```

> Note: currently, only the name of the TJBot is returned in the configuration object. Future releases may include more configuration information.

### Hardware Characteristic

The Hardware characteristic returns a JSON-encoded array of the hardware present in the TJBot. This list is based on the hardware configuration provided in the `tjbot-daemon/config.js` file.

**Sample:**

```
["camera","led","microphone","servo","speaker"]
```

### Capability Characteristic

The Capability characteristic returns a JSON-encoded array with the list of capabilities possessed by the TJBot.

**Sample:**

```
["analyze_tone","converse","listen","see","shine","speak","translate","wave"]
```

## Command Service

The Command service is used to send commands to TJBot, such as “shine,” “wave,” and “analyze_tone.” It is comprised of the following characteristics.

| **Characteristic** | **UUID** | **Properties** |
|---|---|---|
| Command | 799d5f0d-0002-0001-a6a2-da053e2a640a | write |
| Request | 799d5f0d-0002-0002-a6a2-da053e2a640a | write |
| Response | 799d5f0d-0002-0003-a6a2-da053e2a640a | notify |
| Listen | 799d5f0d-0002-0004-a6a2-da053e2a640a | notify |

### Commands, Requests, and Responses

Commands are operations that do not return data. For example, "shine" is a command because there are no data to be returned to the BLE client after `tj.shine()` is called.

Requests are operations that return data. For example, "analyzeTone" is a request because the data returned by Watson Tone Analyzer needs to be returned to the BLE client after `tj.analyzeTone()` is called.

In order to receive the data returned by methods such as `tj.analyzeTone()`, the BLE client must subscribe to the Response characteristic. All data returned from a Command are sent to the BLE client on the Response characteristic.

#### Command and Request Encoding

Commands and Requests are both encoded as a JSON object with two keys: `cmd` and `args`.

```
{"cmd":"<command>","args":"<args>"}
```

`<command>` corresponds to one of the valid TJBot commands, and `<args>` is a JSON object with keys and values as specified in the command table below.

> Note: Bluetooth LE packets have a maximum data size (102 bytes in our testing). If the JSON-encoded command object exceeds this limit, it will be truncated and rejected by the daemon. In practice, we have not encountered this behavior, although it is possible if you are processing long text strings.

**Example command:**

```
{"cmd":"pulse","args":{"duration":"1.0","color":"#3dacf7"}}
```

> This command translates to calling the method `tj.pulse("#3dacf7", 1.0)`.

#### Large Data Sizes

Because many of the data structures returned by Watson services are larger than the Bluetooth LE packet size (in our testing, this is 102 bytes between a Raspberry Pi and an iPad), we send back large data sizes by issuing multiple writes, followed by a null-byte indicator for when a logical packet has finished sending. This scheme is **only** used on the Response characteristic. Thus, clients that subscribe to the Response characteristic must:

1. Receive data when a notify event occurs on the Response characteristic,
2. Add that data to a buffer,
3. Check whether the buffer contains a null byte, and
4. If the buffer contains a null byte, slice out all the data from the beginning of the buffer to the null byte and process it as a received packet.

> Note: be sure not to include the null byte when processing the packet, and be sure the remove the null byte from your buffer before accepting more data!

According to [PunchThrough](https://punchthrough.com/blog/posts/maximizing-ble-throughput-on-ios-and-android), transfer rates of ~2667 bytes/sec (~2.6 K/sec) should be achievable.

#### Special Case: `tj.see()` and `tj.read()`

Because of the limits to data transfer speeds over BLE, we have implemented a special case for the image data captured by `tj.see()` and `tj.read()`. Instead of sending the actual image data (e.g. JPEG data) over BLE, we transfer it via TCP using the HTTP protocol. Internally, the daemon runs a web server using the Node.js `http-server` module listening on port 9080.

Each time `tj.see()` or `tj.read()` are called, the daemon writes the contents of the captured image to `/tmp/tjbot-photo/photo.jpg`. The URL to this photo is returned in the Response object in the `imageURL` property, and the result of `tj.see()`/`tj.read()` is returned in the `objects` property.

```
{"objects":[{"class":"apple","score":0.645656},{"class":"fruit","score":0.598688},{"class":"food","score":0.598688},{"class":"orange","score":0.5},{"class":"vegetable","score":0.28905},{"class":"tree","score":0.28905}],"imageURL":"http://tinker.local:9080/photo.jpg"}
```

The `imageURL` uses the MDNS hostname of the TJBot as the domain name (e.g. "tinker.local" for a hostname of "tinker").

> Note: In order for the BLE client application to be able to retrieve the image from the given `imageURL`, both the BLE client and the Raspberry Pi need to be on the same network! Otherwise, the MDNS address will fail to resolve and the image will not be retreivable.

#### Example of Request/Response Communication Flow

Let C be a BLE client (e.g. an iPad), and D be the tjbot-daemon.

1. C writes to the Command service.

```
{"cmd":"see","args":{}}
```

2. D receives and parses the Request. D makes the following method call to TJBot.

```
var seeResponse = tj.see()
```

3. D writes the `seeResponse` object to the Response characteristic. Assuming a chunk size of 102 bytes, the following four packets are written.

```
packet 1: {"objects":[{"class":"apple","score":0.645656},{"class":"fruit","score":0.598688},{"class":"food","sco
packet 2: re":0.598688},{"class":"orange","score":0.5},{"class":"vegetable","score":0.28905},{"class":"tree","sc
packet 3: ore":0.28905}],"imageURL":"http://tinker.local:9080/photo.jpg"}
packet 4: \0
```

> Note: in the current implemention, the null byte is written separately from the rest of the data. Please do not assume this behavior in your BLE client implementation.

4. C buffers the packets received from the Response characteristic and upon receiving the null byte, processes the response as a logical packet.

> Note: it is safe for the client to assume that any data received on the Response characteristic is in response to the last Request sent on the Command characteristic. We do not use packet sequence numbers to match Requests with Responses.

5. (Optional) If the Response corresponds to a call to `tj.see()` as listed above, the BLE client may issue an HTTP GET request to fetch the result of the image data from the `imageURL` in the response.

#### List of Commands and Requests

The full list of Commands and Requests is given below.

| **Name** | **Type** | **Arguments** |
|---|---|---|
| sleep | Command | `{"msec":"<int>"}` |
| listen | Command | _none_ |
| pauseListening | Command | _none_ |
| resumeListening | Command | _none_ |
| stopListening | Command | _none_ |
| shine | Command | `{"color":"<hex string or color name>"}` |
| pulse | Command | `{"color":"<hex string or color name>","duration":"<int>"}` |
| armBack | Command | _none_ |
| raiseArm | Command | _none_ |
| lowerArm | Command | _none_ |
| wave | Command | _none_ |
| analyzeTone | Request | `{"text":"<text>"}` |
| converse | Request | `{"workspaceId":"<workspace id>","message":"<message>"}` |
| see | Request | _none_ |
| read | Request | _none_ |
| shineColors | Request | _none_ |
| randomColor | Request | _none_ |
| speak | Request | `{"message":"<text>","voice":"<voice>","language":"<language>"}`  |
| play | Request | _none_ |
| translate | Request | _none_ |
| identifyLanguage | Request | `{"text":"<text>"}` |
| isTranslatable | Request | `{"sourceLanguage":"<language>","targetLanguage":"<language">}` |

#### GARRAX List of Commands and Requests

The full list of Commands is given below.

| **Name** | **Type** | **Arguments** |
|---|---|---|
| scan | Request | _none_ |
| scan_results | Request | _none_ |
| wpa_config | Request | `{"ssid": <ssid>, "psk": <psk>, "id_str": <id_str>}}` |
| reboot_tjbot | Request | _none_ |
| shutdown_tjbot | Request | _none_ |

### Speak Characteristic ###

The Speak Characteristic is used to send text to the `tj.speak()` function. It's important to pass the message, the voice and the language, according with the
supported voices and languages supported by the API.

### Listen Characteristic

The Listen characteristic is used to send back data when `tj.listen()` is called. As the method `tj.listen()` turns on the microphone and streams data to Watson Speech To Text, responses from Watson are returned as speech is recognized as text. Thus, each time Watson "hears" an utterance, the callback of `tj.listen()` is invoked, and that data are written to the Listen characteristic. BLE clients may subscribe to the Listen characteristic at any time. Notifications will be received on the Listen characteristic after the "listen" Command has been sent each time new STT data are available.

# Contributing
We encourage you to make enhancements to this library and contribute them back to us via a pull request.

# License
This project uses the [Apache License Version 2.0](LICENSE) software license.
