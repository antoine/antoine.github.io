//"use strict";
//console.log("as");


function idget(id) {
    return document.getElementById(id);
}

function tojson(ob) {
    return JSON.stringify(ob, function (key, value) {
        if(value instanceof Map) {
            return Array.from(value.entries()); // or with spread: value: [...value]
        } else {
            return value;
        }
    }, 2);
}

function jsonfrom(id) {
    return JSON.parse(idget(id).value);
}
function doOnClick(id, dowhat) {
    idget(id).onclick = dowhat;
}
function show(showroom, data) {
    if (typeof data === "string" || data instanceof String) {
        idget(showroom).innerHTML = "<p>" + data + "</p>";
    } else {
        idget(showroom).innerHTML =
            "<p><pre><code class='small'>" +
            tojson(data) +
            "</code></pre></p>" ;
    }
}
function log(data) {
    console.log(data);
    visiblelog(data, false);
}
function logUserData(data) {
    console.log(data);
    visiblelog(data, true);
}
function loge(data) {
    console.error(data);
    visiblelog(data);
}
function visiblelog(data) {
    visiblelog(data, false);
}

function ifdef(o) {
    return typeof o !== 'undefined';
}
function uuidv4() {
    //from http://stackoverflow.com/questions/105034/ddg#2117523
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function visiblelog(data, returnedToESPUser) {
    //no error marker yet
    if (typeof data === "string" || data instanceof String) {
        idget("visible_console").innerHTML += "<p>" + data + "</p>";
    } else {
        idget("visible_console").innerHTML +=
            (returnedToESPUser ? " <div class='row mt-1'> <div class='col-1 bg-success' > </div><div class='col-11'>" : "") +
            "<p><pre><code class='small'>" +
            tojson(data) +
            "</code></pre></p>" +
            (returnedToESPUser ? "</div></div>" : "");
    }
}
function setQuery(id, json) {
    doOnClick(id, function () {
        idget("query").innerHTML = tojson(json);
    });
}

//ESP executor
//function ESPSystem(config, systems) {
function ESPSystem() {

    var nextIGID = 0;
    var nextIFID = 0;
    var files= new Map();
    var links = [];



    this.addIG = function(buttonId) {
        files.set(    
            nextIFID,{ 
                ifid:nextIFID,
                groups: [{IGID:nextIGID}], 
                excludedGroups: []
            });
        refreshLeftIGList();
        refreshRightIGList();
        refreshLinkColoursList();
        show("groupsShowroom", files);
        nextIGID ++;
        nextIFID ++;
        idget(buttonId).innerHTML= "add IG " + nextIGID;
    };

    var refreshLeftIGList = function() {
        var select = idget("leftIG");
        cleanSelect(select); 
        files.forEach(function(file) {
            file.groups.forEach(function(freeGroup) {
                var groupOption = document.createElement("option"); 
                groupOption.text = freeGroup.IGID;
                select.add(groupOption);
            });
        });
    };

    var refreshRightIGList = function() {
        var currentlyOnLeft = currentValue ("leftIG");
        var select = idget("rightIG");
        cleanSelect(select); 
        files.forEach(function(file) {
            file.groups.forEach(function(freeGroup) {

                if (freeGroup.IGID != currentlyOnLeft) {
                    var groupOption = document.createElement("option"); 
                    groupOption.text = freeGroup.IGID;
                    select.add(groupOption);
                }
            });
        });
    };


    this.getNextIGIDForButton = function() {
        return nextIGID;
    };

    this.leftIGChosen= function() {
        refreshRightIGList();
        refreshLinkColoursList();
    };

    this.rightIGChosen= function() {
        refreshLinkColoursList();
    };

    this.addLink = function() {
        var colour = currentValue ("linkColour");
        var currentlyOnLeft = currentValue ("leftIG");
        var currentlyOnRight = currentValue ("rightIG");
        var linkOkToBeAdded = false;
        //merge-forcesplit files
        if (colour === 'WL' || colour === 'MRL') {
            //merge
            linkOkToBeAdded = mergeFile(currentlyOnLeft, currentlyOnRight);
        } else if (colour === 'NMRL' || colour === 'GL') {
            //forcesplit
            linkOkToBeAdded = keepInDifferentFiles(currentlyOnLeft, currentlyOnRight);
        }
        if (linkOkToBeAdded) {
            //making sure the lower group is always on the left to facilitate later matching
            links.push ({colour:colour, 
                        lower:(currentlyOnLeft<currentlyOnRight?currentlyOnLeft:currentlyOnRight), 
                        higher:(currentlyOnLeft < currentlyOnRight?currentlyOnRight:currentlyOnLeft)}); 
        }

        show("linksShowroom", links);
        show("groupsShowroom", files);
        refreshLinkColoursList();
    };

    var mergeFile = function(leftIG, rightIG) {
        var leftIfId = (fileOfGroup (leftIG));
        var rightIfId = (fileOfGroup (rightIG));
        if (leftIfId === rightIfId) {
            log(leftIG +" and "+rightIG+" are already in the same file "+leftIfId+" nothing to do, but links is created");
        } else {
            //merging right onto left
            var leftFile = files.get(leftIfId);
            var rightFile = files.get(rightIfId);
            //merging groups, sure
            rightFile.groups.forEach(function(group) {
                leftFile.groups.push(group);
            });
            //but also collecting the exclusions from the merged group
            rightFile.excludedGroups.forEach(function(excludedGroup) {
                leftFile.excludedGroups.push(excludedGroup);
            });

            files.delete(rightIfId);
        }
        return true;


    }

    var fileOfGroup= function(group) {
        var foundIfid;

        files.forEach(function(file, ifid) {
            if ( !ifdef(foundIfid)) {
                file.groups.every(function(freeGroup ) {
                    if (freeGroup.IGID == group) {
                        foundIfid = ifid;
                        return false;

                    } else {
                        return true;}
                });
            }
        });


        return foundIfid;
    }


    var keepInDifferentFiles = function(leftIG, rightIG) {
        var leftIfId = (fileOfGroup (leftIG));
        var rightIfId = (fileOfGroup (rightIG));
        if (leftIfId === rightIfId) {
            loge(leftIG +" and "+rightIG+" are already in the same file "+leftIfId+", they cannot be kept in different files anymore. ");
            return false;
        } else {
            //TODO not checking for duplicates yet
            var leftFile = files.get(leftIfId);
            leftFile.excludedGroups.push(rightIG);
            var rightFile = files.get(rightIfId);
            rightFile.excludedGroups.push(leftIG);
        }
        return true;

    }

    var currentValue = function(selectId) {
        var select= idget(selectId);
        if (select.selectedIndex>=0) {
            return select.options[select.selectedIndex].value;
        }
    };

    var refreshLinkColoursList= function() {
        //we need to know the IF to ensure no consistent issue is created
        var currentlyOnLeft = currentValue ("leftIG");
        var currentlyOnRight = currentValue ("rightIG");
        if (ifdef(currentlyOnLeft) && ifdef(currentlyOnRight)) {
            //links are always created with the lower ig id first
            var lowerIgId = (currentlyOnLeft < currentlyOnRight?currentlyOnLeft:currentlyOnRight);
            var higherIgId = (currentlyOnLeft < currentlyOnRight?currentlyOnRight:currentlyOnLeft);

            var select = idget("linkColour");
            cleanSelect(select); 

            var canHaveWL = true;
            var canHaveMRL = true;
            var canHaveNMRL = true;
            var canHaveGL = true;


            links.forEach(function(link) {
                if (link.colour != 'YL' && link.lower == lowerIgId && link.higher == higherIgId) {
                    //already a non YL link
                    canHaveWL = false;
                    canHaveMRL = false;
                    canHaveNMRL = false;
                    canHaveGL = false;
                }
            });

            //checking to see if non-merging links are possible
            var leftIfId = (fileOfGroup (currentlyOnLeft));
            var rightIfId = (fileOfGroup (currentlyOnRight));
            var leftFile = files.get(leftIfId);
            leftFile.groups.every(function(group) {
                if (group.IGID == currentlyOnRight) {
                    //remove non merging links to groups already in the same file.
                    canHaveNMRL = false;
                    canHaveGL = false;
                    return false;
                } else {
                    return true;
                }

            });

            //now checking to see if merging links are possible
            var rightFile = files.get(rightIfId);
            if (!areMergingLinksPossible(leftFile, rightFile) || !areMergingLinksPossible(rightFile, leftFile)) {
                        canHaveMRL = false;
                        canHaveWL = false;
            }

            addColourIfPossible(canHaveWL, 'White', 'WL', select);
            addColourIfPossible(canHaveMRL, 'Merging red', 'MRL', select);
            addColourIfPossible(canHaveNMRL, 'Non merging red', 'NMRL', select);
            addColourIfPossible(canHaveGL, 'Green', 'GL', select);

            //assuming multiple yellows are always possible, no case 10 prevalence implemented
            addColourIfPossible(true, 'Yellow', 'YL', select);
        }

    };

    var areMergingLinksPossible = function(aFile, anotherFile) {
        var possible = true;
                aFile.excludedGroups.every(function(leftExcludedGroup) {
                    anotherFile.groups.every(function(rightGroup) {
                        if (leftExcludedGroup == rightGroup.IGID) {
                            possible = false;
                        }
                        return possible;
                    });
                    //for every() contract
                    return possible;
                });
        return possible;
    }

    var addColourIfPossible = function(possible, text, value, select) {
        if (possible) {
            var option = document.createElement("option"); 
            option.text = text;
            option.value = value;
            select.add(option);
        }
    };

    var cleanSelect = function (select) {
        var i, L = select.options.length - 1;
        for(i = L; i >= 0; i--) {
            select.remove(i);
        }
    };

    this.getIGs = function() {
        return groups;
    };
}


var esp = new ESPSystem();
//init add IG button
idget("addIGButton").innerHTML= "add IG " + esp.getNextIGIDForButton();

doOnClick("addIGButton", function () {
    esp.addIG("addIGButton");
});

doOnClick("addLinkButton", function () {
    esp.addLink();
});

idget("leftIG").onchange = function() {
    esp.leftIGChosen();
};

idget("rightIG").onchange = function() {
    esp.rightIGChosen();
};
