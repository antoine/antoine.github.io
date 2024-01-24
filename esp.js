//"use strict";
//console.log("as");


function idget(id) {
    return document.getElementById(id);
}
function cleanSelect(select) {
    var i, L = select.options.length - 1;
    for(i = L; i >= 0; i--) {
        select.remove(i);
    }
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
function show(showroom, name, data) {
    if (typeof data === "string" || data instanceof String) {
        idget(showroom).innerHTML = "<p>"+name+"</p><p>" + data + "</p>";
    } else {
        idget(showroom).innerHTML =
            "<p>"+name+"</p><p><pre><code class='small'>" +
            tojson(data) +
            "</code></pre></p>" ;
    }
}

function JSONStringifyReplacer(key, value) {
    if(value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()), // or with spread: value: [...value]
        };
    } else if(value instanceof Set) {
        return {
            dataType: 'Set',
            value: Array.from(value.values()), // or with spread: value: [...value]
        };
    } else {
        return value;
    }
    
}

function JSONStringifyReviver(key, value) {
    if(typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    } else if (value.dataType === 'Set') {
        return new Set(value.value);
    }
  }
  return value;
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
    function currentValue(selectId) {
        var select= idget(selectId);
        if (select.selectedIndex>=0) {
            return select.options[select.selectedIndex].value;
        }
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

function CMDSystem() {

    //data structure
    var nextSystemID = 0;
    var nextIGID = 0;
    var nextIFID = 0;
    var nextLinkID= 0;
    var files= new Map();
    var links = [];
    var systems = [];

    //managing the buttons allowing the manipulation of state
    //constraints are checked when populating the form, thus constraints are (well, should not be) not checked when adding
    //data, as constraints are assumed not to be possible because the form content was built to prevent them.

    this.addSystem = function(buttonId) {
        //define system for each IG, remove IG frm same system
        systems.push(nextSystemID);
        refreshSystemsOfGroupList();
        show("systemsShowroom", "systems", systems);
        nextSystemID++;
        idget(buttonId).innerHTML= "add system " + nextSystemID;
    };

    var refreshSystemsOfGroupList = function() {
        var select = idget("systemOfGroup");
        cleanSelect(select); 
        systems.forEach(function(system) {
            var systemOption = document.createElement("option"); 
            systemOption.text = system;
            select.add(systemOption);
        });
        refreshSystemsListForMIDQuery();
    };



    this.addIG = function(buttonId) {
        var selectedSystem = currentValue ("systemOfGroup");
        if (ifdef(selectedSystem)) { 
        //define system for each IG, remove IG frm same system
        files.set(    
            nextIFID,{ 
                ifid:nextIFID,
                groups: [{
                    IGID:nextIGID,
                    EUISID:selectedSystem
                }], 
                excludedGroups: []
            });
        refreshLeftIGList();
        refreshRightIGList();
        refreshLinkColoursList();
            show("systemsShowroom", "systems", systems);
            show("groupsShowroom", "individual files", files);
        nextIGID ++;
        nextIFID ++;
        idget(buttonId).innerHTML= "add identity group " + nextIGID;
        }
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
        var leftGroup = group(currentlyOnLeft);
        cleanSelect(select); 
        files.forEach(function(file) {
            file.groups.forEach(function(freeGroup) {

                if (freeGroup.IGID != currentlyOnLeft && 
                    freeGroup.EUISID != leftGroup.EUISID) {
                    var groupOption = document.createElement("option"); 
                    groupOption.text = freeGroup.IGID;
                    select.add(groupOption);
                }
            });
        });
    };

    this.getNextSystemIDForButton = function() {
        return nextSystemID;
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
        //the exception to not checking for constraints after the fact
        var linkOkToBeAdded = false;//WARN if removing the boolean it protects against adding non-existing link colour too
        //merge-forcesplit files
        if (colour === 'WL' || colour === 'MRL') {
            //merge
            linkOkToBeAdded = mergeFile(currentlyOnLeft, currentlyOnRight);
        } else if (colour === 'NMRL' || colour === 'GL') {
            //forcesplit
            linkOkToBeAdded = keepInDifferentFiles(currentlyOnLeft, currentlyOnRight);
        } else if (colour === 'YL') {
            //ideally check that rule of prevalence of link assigned to different authority are valid
            linkOkToBeAdded = true;
        }
        if (linkOkToBeAdded) {
            //making sure the lower group is always on the left to facilitate later matching
            links.push ({ID: nextLinkID,
                         colour:colour, 
                         lower:(currentlyOnLeft<currentlyOnRight?currentlyOnLeft:currentlyOnRight), 
                         higher:(currentlyOnLeft < currentlyOnRight?currentlyOnRight:currentlyOnLeft)}); 
            nextLinkID++;

        }

        show("systemsShowroom", "systems", systems);
        show("linksShowroom", "links", links);
        show("groupsShowroom", "individual files", files);
        refreshRightIGList();
        refreshLinkColoursList();
        refreshQueriableLinksList();
        
    };

    var refreshSystemsListForMIDQuery= function() {
        var span = idget("systemsListForMIDQuery");
        span.innerHTML = '';

        systems.forEach(function(system) {
            var option = document.createElement("div"); 
            option.className = 'form-check form-switch';
            option.innerHTML = '<input class="form-check-input" type="checkbox" role="switch" id="system'+system+'MIDQueryOption"> <label class="form-check-label" for="system'+system+'MIDQueryOption">'+system+'</label>';
            span.appendChild(option);

        });
        
    };
    var refreshQueriableLinksList = function() {
        var select = idget("queriedLink"); 
        cleanSelect(select); 
        links.forEach(function(link) {
            var option = document.createElement("option"); 
            option.text = link.ID; 
            option.value =  link.ID;
            select.add(option);
        });
    };

    var mergeFile = function(leftIG, rightIG) {
        var leftIfId = (fileOfGroup (leftIG));
        var rightIfId = (fileOfGroup (rightIG));
        if (leftIfId === rightIfId) {
            //this should never arrise, and is the only reason for post-constraint checking.
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

    var group = function(groupID) {
        var foundGroup;

        files.forEach(function(file, ifid) {
            if ( !ifdef(foundGroup)) {
                file.groups.every(function(freeGroup ) {
                    if (freeGroup.IGID == groupID) {
                        foundGroup = freeGroup;
                        return false;

                    } else {
                        return true;}
                });
            }
        });


        return foundGroup;
    }

    var fileOfGroup= function(groupID) {
        var foundIfid;

        files.forEach(function(file, ifid) {
            if ( !ifdef(foundIfid)) {
                file.groups.every(function(freeGroup ) {
                    if (freeGroup.IGID == groupID) {
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
            //TODO this should never happen though, since we exclude the link outright, should this (and the returned boolean) remain?
            loge(leftIG +" and "+rightIG+" are already in the same file "+leftIfId+", they cannot be kept in different files anymore. ");
            
            return false;
        } else {
            //TODO not checking for duplicates yet
            var leftFile = files.get(leftIfId);
            leftFile.excludedGroups.push(rightIG);
            var rightFile = files.get(rightIfId);
            rightFile.excludedGroups.push(leftIG);
        }

    }


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


    this.getIGs = function() {
        return groups;
    };

    //managing local and external storage options

    this.jsonRepresentation = function() {
        return JSON.stringify({
            nextSystemID :nextSystemID,
            nextIGID: nextIGID,
            nextIFID: nextIFID,
            nextLinkID: nextLinkID,
            files:files,
            systems:systems,
            links:links}, JSONStringifyReplacer);
    };

    this.reloadWith = function(rawState) {
        var state = JSON.parse(rawState, JSONStringifyReviver);
        files = state.files;
        systems = state.systems;
        links = state.links;
            nextSystemID = state.nextSystemID;
            nextIGID= state.nextIGID;
            nextIFID= state.nextIFID;
            nextLinkID= state.nextLinkID;

        show("systemsShowroom", "systems", systems);
        show("linksShowroom", "links", links);
        show("groupsShowroom", "individual files", files);
        refreshLeftIGList();
        refreshRightIGList();
        refreshLinkColoursList();
        refreshQueriableLinksList();
        refreshSystemsListForMIDQuery();
        idget("addSystemButton").innerHTML= "add system " + nextSystemID;
        idget("addIGButton").innerHTML= "add identity group " + nextIGID;

    };

    //managing queries

    this.getLink = function(linkID) {
        var foundLink;
        links.every(function(link) {
            if (link.ID == linkID) {
                foundLink = link;
                return false;
            } else {
                return true;
            }
                
        });
        return foundLink;
    };

    this.getRelationOf = function(link) {
        var linksInSameRelation = [];
        links.forEach(function(observedLink) {
            if (observedLink.lower == link.lower && observedLink.higher == link.higher) {
                linksInSameRelation.push(observedLink);
            }
                
        });
        return linksInSameRelation;
    };

    this.getGroup = function(groupID) {
        return group(groupID);
    }
}


function ESPSystem(cmd) {
    this.fetchLink = function() { 
        var querytype = currentValue("LMFQueryTypes");
        var motivations = [];
        if (querytype == 'YLR1') {
            //if not verifying authority then the profile cannot be used
            if (!idget("asVerifierOfTheLink").checked) {
                respondWith("error");
                motivations.push( "YLR1 QT cannot be used without being the verifying authority");
            } else {

            var queriedLink = currentValue("queriedLink");
            var link = cmd.getLink(queriedLink);
            //TODO we should only load the relation if the link is actually yellow! 
                var linksToReturn = [];
                if (link.colour == "YL") {
                    linksToReturn.push (cmd.getRelationOf(link));
                    motivations.push("link "+link.ID+" is currently yellow, full relationship is returned.");
                } else {
                    linksToReturn.push (link);
                    motivations.push("link "+link.ID+" is "+link.colour+", but you are using a YLR query type so it shouldn't work but you were the verifying authority so it does. Only the full relationship is not returned since the link is not yellow anymore.");
                }

            respondWith({
                     links: linksToReturn,
                     lowerGroup: cmd.getGroup(link.lower),
                     higherGroup: cmd.getGroup(link.higher)
                 }
                );
            //if system access then run DMF query (+linked matches again) on the basis of the groups found
            }
            
        } else {
                respondWith("error");
            motivations.push("querytype "+querytype+" not yet supported"); 
        }
        motivateResponseWith(motivations);
    };

    var respondWith= function(value) {
            show("MIDQueryResult", "response", value);
    };

    var motivateResponseWith = function(motivations) {
        var list = "<p>Motivations:<li>";
        motivations.forEach(function(motivation) {
            list+="<ul>"+motivation+"</ul>";
        });
        list += "</li></p>";
        idget("MIDQueryMotivations").innerHTML = list; 
    };


}

function StorageSystem(cmd) {

    var localstorage_entry_point = "LS_CMD_STATES";

    this.saveState = function (inputName, selectToRefreshName) {
        var stateName= idget(inputName); 
        localStorage.setItem(stateName.value, cmd.jsonRepresentation());
        saveStateName(stateName.value);
        this.refreshStatesList(selectToRefreshName);
    };

    var saveStateName= function(name) {
        var statesNames = getStatesList();
        statesNames.add(name);
        localStorage.setItem(localstorage_entry_point, JSON.stringify(statesNames, JSONStringifyReplacer));
    };

    var getStatesList = function() {
        //returns a Set
        if (localStorage.getItem(localstorage_entry_point) == null ) {
            localStorage.setItem(localstorage_entry_point, JSON.stringify(new Set(), JSONStringifyReplacer));
        }
        return JSON.parse(localStorage.getItem(localstorage_entry_point), JSONStringifyReviver);
    };

    this.refreshStatesList = function (selectName) {
        var select = idget (selectName);
        cleanSelect(select); 
        var statesNames = getStatesList();
        statesNames.forEach(function(stateName) {

                var option = document.createElement("option"); 
                option.text = stateName;
                select.add(option);
        });
    };

    this.loadData = function(selectWithStateToLoadName, idOfInputToSaveState) {
        var stateToLoad = currentValue(selectWithStateToLoadName);
        cmd.reloadWith(localStorage.getItem(stateToLoad));
        idget(idOfInputToSaveState).value = stateToLoad;
    };
}

var cmd = new CMDSystem();
var esp = new ESPSystem(cmd);
var storage = new StorageSystem(cmd);

storage.refreshStatesList("selectedSavedState");
//init add IG button
idget("addIGButton").innerHTML= "add identity group " + cmd.getNextIGIDForButton();

idget("addSystemButton").innerHTML= "add system " + cmd.getNextSystemIDForButton();

doOnClick("addSystemButton", function () {
    cmd.addSystem("addSystemButton");
});

doOnClick("saveData", function () {
    storage.saveState("stateName", "selectedSavedState");
});

doOnClick("loadData", function () {
    storage.loadData("selectedSavedState", "stateName");
});

doOnClick("addIGButton", function () {
    cmd.addIG("addIGButton");
});

doOnClick("addLinkButton", function () {
    cmd.addLink();
});

doOnClick("LMFquery", function () {
    esp.fetchLink();
});

idget("leftIG").onchange = function() {
    cmd.leftIGChosen();
};

idget("rightIG").onchange = function() {
    cmd.rightIGChosen();
};


