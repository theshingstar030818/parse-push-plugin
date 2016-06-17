Rebuild the ionic-testpn example app.
------------------------------------

In the ionic-testpn directory, do:

```bash

# restore required node tool chain
npm update --dev

# restore ionic platforms and base plugins
ionic state restore

# restore bower dependencies
bower update

# install the plugin with your sender id
ionic plugin add ../../ --variable GCM_SENDER_ID=1234567

```

Now go to config.xml and `www/js/app.js` change your `ParseServerUrl` preference.


Set up local parse-server.
--------------------------

If you need help setting up a local parse-server, [ here's a quick-start guide](https://taivo.github.io/guides/parse-server-for-local-development).

If you already have a running Mongodb and a working parse-server installation, you
can use the included server configuration to get a minimal push notification server going.
First edit that file to use your push certificates and api key. Then from this example
directory, type:

```bash
parse-server testpn-server.json

```

This will start a server whose cloud code is in the testpn-cloudcode directory.


2 and 2 together
----------------

With a parse-server running for the `TESTPN` app, you can use `ionic serve` on the
ionic-testpn app to see if it is working. You can then install that app to your test
devices via USB.

Don't forget to update ParseServerUrl in both config.xml and app.js
(1 for device, the other for javascript).

Finally, if you are using this local parse-server setup, make sure your test device
can reach your server IP, i.e., they are on the same local network.
