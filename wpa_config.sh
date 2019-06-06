#!/bin/sh
#set primary network settings
INDEX=$(wpa_cli -p /var/run/wpa_supplicant -i p2p-dev-wlan0 add_network)
wpa_cli -p /var/run/wpa_supplicant -i p2p-dev-wlan0 set_network $INDEX ssid \"${1}\"
wpa_cli -p /var/run/wpa_supplicant -i p2p-dev-wlan0 set_network $INDEX scan_ssid 1
wpa_cli -p /var/run/wpa_supplicant -i p2p-dev-wlan0 set_network $INDEX key_mgmt WPA-PSK
wpa_cli -p /var/run/wpa_supplicant -i p2p-dev-wlan0 set_network $INDEX psk \"${2}\"
wpa_cli -p /var/run/wpa_supplicant -i p2p-dev-wlan0 set_network $INDEX id_str \"${3}\"
wpa_cli -p /var/run/wpa_supplicant -i p2p-dev-wlan0 enable_network $INDEX
wpa_cli save_config
