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

// Color index 144-191 (48 colors)
colorZoneMapping: [
    "forearm-dark", "forearm-medium", "forearm-light",
    "armStripe3-light", "armStripe3-medium", "armStripe3-dark",
    "armStripe2-dark", "armStripe2-medium", "armStripe2-light",
    "armStripe1-light", "armStripe1-medium", "armStripe1-dark",
    "armUpper-light", "armUpper-medium", "armUpper-dark",
    "yolkCorner", "shoulderPatch", "yolk3", "yolk1", "yolk2",
    "goalieMask", "jersey-light", "jersey-medium", "jersey-dark",
    "waist1-odd", "waist1-even", "waist1-hidden",
    "waist2-light", "waist2-medium", "waist2-dark",
    "waist3-light", "waist3-medium", "waist3-dark",
    "pants-dark", "pantsStripe2", "pantsStripe1", "pants-medium",
    "socks-light", "socks-medium", "socks-dark",
    "socksStripe1-light", "socksStripe1-medium", "socksStripe1-dark",
    "socksStripe2-light", "socksStripe2-medium", "socksStripe2-dark",
    "helmet-medium", "helmet-dark"];
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

/* TODO:
- document bin format
- document act format
- write script which converts jerseyDef to bin segment
- update binToAct script to accept bin segment and convert to act