const jerseyDef = {
    "global": {
        "palette": {
            "brown": "144 108 0",
            "black": "0 0 0",
            "blackMedium": "36 36 36",
            "darkBrown": "108 72 36",
            "flesh": "216 144 108",
            "flesh2": "216 144 108",
            "flesh3": "180 108 72",
            "flesh3bit": "216 144 108",
            "flesh3bit2": "180 108 72",
            "white": "252 252 252",
            "whiteMedium": "216 216 216",
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
    "3": {
        "name": "Chicago Blackhawks",
        "abbreviation": "CHI",
        "palette": {
            "red": "144 0 0",
            "yellow": "180 180 0",
            "brightRed": "180 0 0"
        },
        "jerseys": {
            "home": {
                "template": "classic",
                "helmet": "white",
                // "yolk1": "0 0 0",
                // "yolk2": "0 0 0",
                // "yolk3": "0 0 0",
                // "yolkCorner": "0 0 0",
                "shoulderPatch": "yellow",
                "jersey": "white",
                "waist1": "red",
                "waist2": "whiteMedium",
                "waist3": "blackMedium",
                "pants": "black",
                "pantsStripe1": "white",
                "pantsStripe2": "red",
                // "socks": "0 0 0",
                "socksStripe1": "red",
                "socksStripe2": "black",
                // "armUpper": "0 0 0",
                "armStripe1": "red",
                "armStripe2": "whiteMedium",
                "armStripe3": "blackMedium",
                // "forearm": "0 0 0",
                "goalieMask": "white",
                "crest": [
                    "white",   "black", "black", "black",     "white",
                    "white",   "brown", "black", "black",     "brightRed",
                    "brown",   "brown", "brown", "brightRed", "yellow",
                    "white",   "brown", "black", "brown",     "white",
                ]
            },
            "away": {
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
                "crest": [
                    "red",   "black", "black", "black",     "red",
                    "red",   "brown", "black", "black",     "brightRed",
                    "brown", "brown", "brown", "brightRed", "yellow",
                    "red",   "brown", "black", "brown",     "red",
                ]
            }
        } 
    }
}

module.exports = jerseyDef;