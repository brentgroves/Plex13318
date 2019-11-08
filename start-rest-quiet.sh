#!/bin/bash
( node ~/srcnode/Plex13318/app.js & node ~/srcnode/MySql13318/app.js & node ~/srcnode/Socket13318/app.js & node ~/srcnode/Express/app.js )  > /dev/null 2>&1 
