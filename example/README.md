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

# install the local copy of parse-push-plugin you already have
ionic plugin add ../../

```

Now go to config.xml to set `ParseServerUrl` and `ParseGcmSenderId`. After that,
open `www/js/app.js` and update the `serverURL` as well.


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

With a parse-server running for `TESTPN` app, you can use `ionic serve` on
ionic-testpn to see if it is working. You can then install to your test
devices via USB.

Don't forget to update `ParseServerUrl` in both config.xml and app.js
(1 for device, the other for javascript). Use the actual IP, not `localhost` because
your test device needs to reach your server. Also, make sure both your device and
computer are on the same network, i.e., device not on LTE and server on wifi.
