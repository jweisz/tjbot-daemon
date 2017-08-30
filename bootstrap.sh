#!/bin/sh

#----intro message
echo ""
echo "-----------------------------------------------------------------------"
echo "Welcome! Let's set up your Raspberry Pi with the tjbot-daemon software."
echo "-----------------------------------------------------------------------"

#----confirm bootstrap
read -p "Would you like to install tjbot-daemon? [Y/n] " choice </dev/tty
case "$choice" in
    "n" | "N")
        echo "OK, tjbot-daemon will not be installed at this time."
        exit
        ;;
    *) ;;
esac

#----installing additional software packages
echo ""
echo "Installing additional software packages (bluetooth, bluez, libbluetooth-dev, libudev-dev)"
echo "Please enter your root password if prompted."
sudo apt-get install -y bluetooth bluez libbluetooth-dev libudev-dev

#----clone tjbot
echo ""
echo "We are ready to clone the tjbot-daemon project."
read -p "Where should we clone it to? (default: /home/pi/Desktop/tjbot-daemon): " DAEMON_DIR </dev/tty
if [ -z $DAEMON_DIR ]; then
    DAEMON_DIR='/home/pi/Desktop/tjbot-daemon'
fi

if [ ! -d $DAEMON_DIR ]; then
    echo "Cloning tjbot-daemon project to $DAEMON_DIR"
    git clone https://github.com/jweisz/tjbot-daemon.git $DAEMON_DIR
else
    echo "tjbot-daemon project already exists in $DAEMON_DIR, leaving it alone"
fi

#----copy config.js
echo ""
echo "Generating tjbot-daemon configuration"
if [ ! -f $DAEMON_DIR/config.js ]; then
    echo "config.js file does not exist in $DAEMON_DIR, creating it from config.default.js"
    cp $DAEMON_DIR/config.default.js $DAEMON_DIR/config.js

    echo ""
    read -p "Does your TJBot have a camera installed? (y/N): " camera </dev/tty
    read -p "Does your TJBot have an LED installed? (y/N): " led </dev/tty
    read -p "Does your TJBot have a microphone installed? (y/N): " mic </dev/tty
    read -p "Does your TJBot have a servo installed? (y/N): " servo </dev/tty
    read -p "Does your TJBot have a speaker installed? (y/N): " speaker </dev/tty

    prefix=''
    hardware=''
    case "$camera" in
        "y" | "Y")
            hardware="$hardware$prefix'camera'"
            prefix=', '
            ;;
        *) ;;
    esac
    case "$led" in
        "y" | "Y")
            hardware="$hardware$prefix'led'"
            prefix=', '
            ;;
        *) ;;
    esac
    case "$mic" in
        "y" | "Y")
            hardware="$hardware$prefix'mic'"
            prefix=', '
            ;;
        *) ;;
    esac
    case "$servo" in
        "y" | "Y")
            hardware="$hardware$prefix'servo'"
            prefix=', '
            ;;
        *) ;;
    esac
    case "$speaker" in
        "y" | "Y")
            hardware="$hardware$prefix'speaker'"
            prefix=', '
            ;;
        *) ;;
    esac

    sed -i "s/exports.hardware = \[\];/exports.hardware = \[$hardware\];/" $DAEMON_DIR/config.js
else
    echo "config.js file already exists in $DAEMON_DIR, leaving it alone"
fi

#----npm install
echo ""
echo "Installing Node modules for tjbot-daemon"
npm install --prefix $DAEMON_DIR

#----instructions for watson credentials
echo ""
echo "Notice about Watson services: In order to use tjbot-daemon, you will"
echo "need to obtain credentials for the Watson services it needs."
echo "You can obtain these credentials as follows:"
echo ""
echo "1. Sign up for a free IBM Bluemix account at https://bluemix.net if you do
not have one already."
echo ""
echo "2. Log in to Bluemix and create an instance of the Watson services you plan
to use. The Watson services are listed on the Bluemix dashboard, under
\"Catalog\". The full list of Watson services used by tjbot-daemon are:"
echo "Conversation, Language Translator, Speech to Text, Text to Speech,"
echo "Tone Analyzer, and Visual Recognition."
echo ""
echo "3. For each Watson service, click the \"Create\" button on the bottom right
of the page to create an instance of the service."
echo ""
echo "4. Click \"Service Credentials\" in the left-hand sidebar. Next, click
\"View Credentials\" under the Actions menu."
echo ""
echo "5. Make note of the credentials for each Watson service. You will need to save
these in $DAEMON_DIR/config.js."

#----run the daemon
echo ""
echo "Your TJBot has been set up with tjbot-daemon. Please edit the config.js file"
echo "to add the Watson credentials. You may start the daemon manually by running"
echo "the following command:"
echo ""
echo "sudo node $DAEMON_DIR/tjbot-daemon.js"
echo ""
echo "Have fun!"
