#!/usr/bin/env bash

# mostly copied from https://serversforhackers.com/self-signed-ssl-certificates

# Specify where we will install
SSL_DIR="certs"

# Set the domain we want to use
DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $(basename $0) <domain>"
  exit 11
fi

# A silly passphrase
PASSPHRASE="tomato"

# Set our CSR variables
SUBJ="
C=AU
ST=Perth
O=
localityName=Perth
commonName=$DOMAIN
organizationalUnitName=
emailAddress=
"

# Generate our Private Key, CSR and Certificate
sudo openssl genrsa -out "$SSL_DIR/server.key" 2048
sudo openssl req -new -subj "$(echo -n "$SUBJ" | tr "\n" "/")" -key "$SSL_DIR/server.key" -out "$SSL_DIR/server.csr" -passin pass:$PASSPHRASE
sudo openssl x509 -req -days 365 -in "$SSL_DIR/server.csr" -signkey "$SSL_DIR/server.key" -out "$SSL_DIR/server.crt"