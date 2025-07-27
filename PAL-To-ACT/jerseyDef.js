const jerseyDef = {
    "global": {
        "palette": {
            "brown": "144 108 0",
            "black": "0 0 0",
            "darkBrown": "108 72 36",
            "flesh": "220 148 104",
            "flesh2": "200 132 92",
            "flesh3": "164 108 72",
            "flesh3bit": "216 144 108",
            "flesh3bit2": "180 108 72",
            "white": "252 252 252"
        },
        "mapping": {
            "stick": "brown",
            "equipment": "black",
            "eyes": "darkBrown",
            "skin1": "flesh3bit",
            "skin2": "flesh3bit2",
            "skin3": "flesh3bit2",
            "skateBlade": "white"
        }
    },
    "0": {
        "name": "Chicago Blackhawks",
        "palette": {
            "red": "144 0 0",
            "yellow": "180 180 0"
            // "chiWhite": "216 216 216"
        },
        "home": {
            "template": "classic",
            "helmet": "black",
            // "yolk1": "0 0 0",
            // "yolk2": "0 0 0",
            // "yolk3": "0 0 0",
            // "yolkCorner": "0 0 0",
            "shoulderPatch": "yellow",
            "jersey": "red",
            "waist1": "white",
            "waist2": "black",
            "waist3": "white",
            "pants": "black",
            "pantsStripe1": "white",
            "pantsStripe2": "red",
            // "socks": "0 0 0",
            "socksStripe1": "white",
            "socksStripe2": "black",
            // "armUpper": "0 0 0",
            "armStripe1": "white",
            "armStripe2": "black",
            "armStripe3": "white",
            // "forearm": "0 0 0",
            "goalieMask": "white",
        }, crest: [
            "red",   "black", "black", "black",     "red",
            "red",   "brown", "black", "black",     "brightRed",
            "brown", "brown", "brown", "brightRed", "yellow",
            "red",   "brown", "black", "brown",     "red",
        ],
    }
}

module.exports = jerseyDef;

/* template names
    - classic
    - armBand
    - checkWaist
    - vWaist
    - vWaistWide
    - upSlope
    - downSlope
    - sharpYolk
    - star
    - fisherman
    - tampaStorm
    - wildWing
    - burgerKing
    - pedestal
    - bear
    - checkChest (mid chest check)
    - nordiques (fleur de lis)
    - Flyers (arm curves)
    - Canadiens (mid chest stripe)
    - Predators (curved arm stripe)
*/