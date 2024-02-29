"use strict";
//console.log("as");

function idget(id) {
  return document.getElementById(id);
}

/*
function jsonfrom(id) {
  return JSON.parse(idget(id).value);
}
*/
function doOnClick(id, dowhat) {
  idget(id).onclick = dowhat;
}

function printForUser(showroom, name, data) {
  if (typeof data === "string" || data instanceof String) {
    idget(showroom).innerHTML = "<p>" + name + "</p><p>" + data + "</p>";
  } else {
    idget(showroom).innerHTML =
      "<p>" +
      name +
      "</p><p><pre><code class='small'>" +
      tojson(data) +
      "</code></pre></p>";
  }
}

//STATE serizalition
function tojson(ob) {
  return JSON.stringify(ob, JSONStringifyReplacer, 2);
}

function JSONStringifyReplacer(key, value) {
  if (value instanceof Map) {
    return {
      dataType: "Map",
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else if (value instanceof Set) {
    return {
      dataType: "Set",
      value: Array.from(value.values()), // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}

function JSONStringifyReviver(key, value) {
  if (typeof value === "object" && value !== null) {
    if (value.dataType === "Map") {
      return new Map(value.value);
    } else if (value.dataType === "Set") {
      return new Set(value.value);
    }
  }
  return value;
}

function ifdef(o) {
  return typeof o !== "undefined";
}
function isOneOf(one, many) {
  var yesItIs = false;

  many.every(function (maybeOne) {
    if (maybeOne == one) {
      yesItIs = true;
      return false;
    } else {
      return true;
    }
  });
  return yesItIs;
}

//form elements manipulation
function currentValue(selectId) {
  var select = idget(selectId);
  if (select.selectedIndex >= 0) {
    return select.options[select.selectedIndex].value;
  }
}
function cleanSelect(select) {
  var i,
    L = select.options.length - 1;
  for (i = L; i >= 0; i--) {
    select.remove(i);
  }
}
/*
function uuidv4() {
  //from http://stackoverflow.com/questions/105034/ddg#2117523
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
*/

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
function visiblelog(data, returnedToESPUser) {
  //no error marker yet
  if (typeof data === "string" || data instanceof String) {
    idget("visible_console").innerHTML += "<p>" + data + "</p>";
  } else {
    idget("visible_console").innerHTML +=
      (returnedToESPUser
        ? " <div class='row mt-1'> <div class='col-1 bg-success' > </div><div class='col-11'>"
        : "") +
      "<p><pre><code class='small'>" +
      tojson(data) +
      "</code></pre></p>" +
      (returnedToESPUser ? "</div></div>" : "");
  }
}

function show(id) {
  idget(id).style.display = "initial";
}

function hide(id) {
  idget(id).style.display = "none";
}

/*
function setQuery(id, json) {
  doOnClick(id, function () {
    idget("query").innerHTML = tojson(json);
  });
}
*/

function MIDSystem() {
  const outcomes = {
    white: "WL",
    noLink: "NL",
    mergingRed: "MRL",
    greenLink: "GL",
    nonMergingRedLink: "NMRL"
  }

  const flags = {
    biometricFalseRejection : "falseRejection",
    biometricFalsePositive : "falsePositive",
    biographicSameSHBOther : "sameSHBOther",
    biographicSimilarSHBOther : "similarSHBOther",
    biographicDifferentSHBOther : "differentSHBOther",
  }
  const FPA= {flag: flags.biometricFalsePositive, 
    alternative: (thisIndex) => thisIndex + 9};
  const FRA= {flag: flags.biometricFalseRejection, 
    alternative: (thisIndex) => thisIndex - 9};
  const sameA= 
      {flag: flags.biographicSameSHBOther, 
    alternatives:[ 
        (thisIndex) => thisIndex + 3,
        (thisIndex) => thisIndex + 6]};
  const similarA= 
      {flag: flags.biographicSimilarSHBOther, 
    alternatives:[ 
        (thisIndex) => thisIndex - 3,
        (thisIndex) => thisIndex + 3]};
  const differentA= 
      {flag: flags.biographicDifferentSHBOther, 
    alternatives:[ 
        (thisIndex) => thisIndex - 3,
        (thisIndex) => thisIndex - 6]};
  const allProps = [
  /*1*/  { "desc": "=,=,=", "outcomes": [outcomes.white], implicitBMF: FPA, implicitBGF:sameA },
  /*2*/  { "desc": "=,=,≠", "outcomes": [outcomes.white], implicitBMF: FPA, implicitBGF:sameA},
  /*3*/  { "desc": "=,=,∅", "outcomes": [outcomes.white], implicitBMF: FPA, implicitBGF:sameA},
  /*4*/  { "desc": "=,≈,=", "outcomes": [outcomes.white], implicitBMF: FPA, implicitBGF:similarA},
  /*5*/  { "desc": "=,≈,≠", "outcomes": [outcomes.white, outcomes.mergingRed], implicitBMF: FPA, implicitBGF:similarA},
  /*6*/  { "desc": "=,≈,∅", "outcomes": [outcomes.white, outcomes.mergingRed], implicitBMF: FPA, implicitBGF:similarA},
  /*7*/  { "desc": "=,≠,=", "outcomes": [outcomes.white, outcomes.mergingRed], implicitBMF: FPA, implicitBGF:differentA},
  /*8*/  { "desc": "=,≠,≠", "outcomes": [outcomes.white, outcomes.mergingRed], implicitBMF: FPA, implicitBGF:differentA},
  /*9*/  { "desc": "=,≠,∅", "outcomes": [outcomes.white, outcomes.mergingRed], implicitBMF: FPA, implicitBGF:differentA},
  /*10*/  { "desc": "≠,=,=", "outcomes": [outcomes.greenLink, outcomes.nonMergingRedLink] , implicitBMF: FRA, implicitBGF:sameA},
  /*11*/  { "desc": "≠,=,≠", "outcomes": [outcomes.greenLink, outcomes.nonMergingRedLink] , implicitBMF: FRA , implicitBGF:sameA},
  /*12*/  { "desc": "≠,=,∅", "outcomes": [outcomes.greenLink, outcomes.nonMergingRedLink] , implicitBMF: FRA , implicitBGF:sameA},
  /*13*/  { "desc": "≠,≈,=", "outcomes": [outcomes.greenLink, outcomes.nonMergingRedLink] , implicitBMF: FRA , implicitBGF:similarA},
  /*14*/  { "desc": "≠,≈,≠", "outcomes": [outcomes.noLink] , implicitBMF: FRA , implicitBGF:similarA},
  /*15*/  { "desc": "≠,≈,∅", "outcomes": [outcomes.noLink] , implicitBMF: FRA , implicitBGF:similarA},
  /*16*/  { "desc": "≠,≠,=", "outcomes": [outcomes.greenLink, outcomes.nonMergingRedLink] , implicitBMF: FRA , implicitBGF:differentA},
  /*17*/  { "desc": "≠,≠,≠", "outcomes": [outcomes.noLink] , implicitBMF: FRA , implicitBGF:differentA},
  /*18*/  { "desc": "≠,≠,∅", "outcomes": [outcomes.noLink] , implicitBMF: FRA , implicitBGF:differentA},
  /*19*/  { "desc": "∅,=,=", "outcomes": [outcomes.white] , implicitBGF:sameA},
  /*20*/  { "desc": "∅,=,≠", "outcomes": [outcomes.noLink] , implicitBGF:sameA},
  /*21*/  { "desc": "∅,=,∅", "outcomes": [outcomes.noLink] , implicitBGF:sameA},
  /*22*/  { "desc": "∅,≈,=", "outcomes": [outcomes.white] , implicitBGF:similarA},
  /*23*/  { "desc": "∅,≈,≠", "outcomes": [outcomes.noLink] , implicitBGF:similarA},
  /*24*/  { "desc": "∅,≈,∅", "outcomes": [outcomes.noLink] , implicitBGF:similarA},
  /*25*/  { "desc": "∅,≠,=", "outcomes": [outcomes.noLink] , implicitBGF:differentA},
  /*26*/  { "desc": "∅,≠,≠", "outcomes": [outcomes.white, outcomes.greenLink, outcomes.mergingRed, outcomes.nonMergingRedLink] , implicitBGF:differentA},
  /*27*/  { "desc": "∅,≠,∅", "outcomes": [outcomes.noLink] , implicitBGF:differentA}
  ];

  //data structure
  //var nextProposalID = 0;
  var selectedProposals = [];

  this.showAllProps = function () {
    const container = idget("allProposals");
    container.innerHTML = "";
    const mid = this;

    var row = document.createElement("div");
    row.className = "row";
    allProps.forEach(function (proposal, index) {

      var addPropButton = document.createElement("button");
      addPropButton.type = "button";
      if (index < 9) {
        addPropButton.className = "btn btn-success mt-1";
      } else if (index < 18) {
        addPropButton.className = "btn btn-warning mt-1";

      } else {
        addPropButton.className = "btn btn-info mt-1";

      }
      addPropButton.onclick = function () {
        mid.selectProp(index);
      };

      addPropButton.innerHTML = proposal.desc;
      const colAuto = document.createElement("div");
      colAuto.className = 'col-auto';
      colAuto.appendChild(addPropButton);
      row.appendChild(colAuto);
      if ((index + 1) % 3 == 0) {
        container.appendChild(row);
        row = document.createElement("div");
        row.className = "row";
      }
    });
  };

  this.selectProp = function (proposalIndex) {

    //var propId = selectedProposal+ "_" + nextProposalID;
    //nextProposalID ++;
    selectedProposals.push(proposalIndex);
    refreshExplicitDecisionsList(selectedProposals);
    refreshImplicitDecisionsList(selectedProposals);

  };

  var refreshExplicitDecisionsList = function (showResultOfSelectingProposals) {
    const span = idget("selectedProposals");
    span.innerHTML = "";

    var directOutcomes = [];

    const listOutcomes = (proposalIndex) => {
      var outcomesText = ""
      allProps[proposalIndex].outcomes.forEach(outcome => {
        outcomesText += outcome + ", ";

      });
      return outcomesText.substring(0, outcomesText.length-2);
    };

    //collecting proposals
    showResultOfSelectingProposals.forEach(function (proposalIndex) {
      var prop = document.createElement("p");
      prop.innerHTML = "case #" + (proposalIndex+1) + " " + allProps[proposalIndex].desc + " → ";
      prop.innerHTML += listOutcomes(proposalIndex);
      directOutcomes.push(...allProps[proposalIndex].outcomes);
      span.appendChild(prop);
    });

    //showing outcomes
    var uniqueDirectOutcomes = [... new Set(directOutcomes)];
    var hasAtLeastALink = false;
    var directDecisionsText = "";
    uniqueDirectOutcomes.forEach(element => {
      if (element != outcomes.noLink) {
        hasAtLeastALink = true;
        directDecisionsText += element + ", "
      }

    });

    var prop = document.createElement("p");
    if (hasAtLeastALink) {
      prop.innerHTML = "possible explicit decisions: " + directDecisionsText.substring(0, directDecisionsText.length -2);

    } else {
      prop.innerHTML = "no link to be created ";

    }
    span.appendChild(prop);
  };

  var refreshImplicitDecisionsList = function (showResultOfSelectingProposals) {
    const span = idget("implicitDecisions");
    span.innerHTML = "";

    var allOutcomes = [];

    showResultOfSelectingProposals.forEach(function (proposalIndex) {
      var prop = allProps[proposalIndex];
      //we only care about those proposals leading to a link to start with
        allOutcomes.push({flags:[], outcomes:[...prop.outcomes]});
        //pushing the biometric flag outcomes if any
        if (ifdef(prop.implicitBMF)) {
          var implicitPropIndex = prop.implicitBMF.alternative(proposalIndex);
          var implicitProp = allProps[implicitPropIndex];
          allOutcomes.push({flags:[prop.implicitBMF.flag], outcomes:[...implicitProp.outcomes]});
          //explore the BGF alternatives as well
          implicitProp.implicitBGF.alternatives.forEach(alternativeBG => {
            allOutcomes.push({flags:[prop.implicitBMF.flag, implicitProp.implicitBGF.flag], outcomes:[...allProps[alternativeBG(implicitPropIndex)].outcomes]});
          });
        }
        prop.implicitBGF.alternatives.forEach(alternativeBG => {
          allOutcomes.push({flags:[prop.implicitBGF.flag], outcomes:[...allProps[alternativeBG(proposalIndex)].outcomes]});
        });
    });
    
    var uniqueImplicitOutcomes = new Map();

    allOutcomes.forEach(flagBasedOutcomes => {
      flagBasedOutcomes.outcomes.forEach(outcome => {
        if (uniqueImplicitOutcomes.has(outcome)) {
          var outcomeFlags= uniqueImplicitOutcomes.get(outcome); 
          //remove biographic flags not shared for a given outcome, also remove all biometric error flasg
          var commonFlags = outcomeFlags.filter(value => 
            ![flags.biometricFalsePositive, flags.biometricFalseRejection].includes(value) && flagBasedOutcomes.flags.includes(value))
          //and now add back all biometric error flags from both list
          if (isOneOf(flags.biometricFalsePositive, outcomeFlags) || isOneOf(flags.biometricFalsePositive, flagBasedOutcomes.flags)) {
            commonFlags.push(flags.biometricFalsePositive);
          }
          if (isOneOf(flags.biometricFalseRejection, outcomeFlags) || isOneOf(flags.biometricFalseRejection, flagBasedOutcomes.flags)) {
            commonFlags.push(flags.biometricFalseRejection);
          }

          uniqueImplicitOutcomes.set(outcome, commonFlags);
        } else {
          uniqueImplicitOutcomes.set(outcome, [...flagBasedOutcomes.flags]);
        }
      });
    });


    var hasAtLeastALink = false;
    var directDecisionsText = document.createElement("ul"); 
    uniqueImplicitOutcomes.forEach((flags, outcome)=> {
        hasAtLeastALink = true;
        var item = document.createElement("li");
        item.innerHTML = JSON.stringify(outcome)+ " => flags: " + JSON.stringify(flags) ;
        directDecisionsText.appendChild(item);

    });


    var prop = document.createElement("p");
    if (hasAtLeastALink) {
      prop.innerHTML = "all possible decisions: ";

    } else {
      prop.innerHTML = "no link to be created ";
    }
    span.appendChild(prop);
    span.appendChild(directDecisionsText);

  };
}

function StorageSystem(cmd) {
  var localstorage_entry_point = "LS_CMD_STATES";

  this.saveState = function (inputName, selectToRefreshName) {
    var stateName = idget(inputName);
    localStorage.setItem(stateName.value, cmd.jsonRepresentation());
    saveStateName(stateName.value);
    this.refreshStatesList(selectToRefreshName);
  };
  this.deleteState = function (selectWithStateToDeleteName) {
    const stateToDelete = currentValue(selectWithStateToDeleteName);
    removeStateName(stateToDelete);
    localStorage.removeItem(stateToDelete);
    this.refreshStatesList(selectWithStateToDeleteName);
  };

  var saveStateName = function (name) {
    var statesNames = getStatesList();
    statesNames.add(name);
    localStorage.setItem(
      localstorage_entry_point,
      JSON.stringify(statesNames, JSONStringifyReplacer),
    );
  };
  var removeStateName = function (name) {
    var statesNames = getStatesList();
    statesNames.delete(name);
    localStorage.setItem(
      localstorage_entry_point,
      JSON.stringify(statesNames, JSONStringifyReplacer),
    );
  };

  var getStatesList = function () {
    //returns a Set
    if (localStorage.getItem(localstorage_entry_point) == null) {
      localStorage.setItem(
        localstorage_entry_point,
        JSON.stringify(new Set(), JSONStringifyReplacer),
      );
    }
    return JSON.parse(
      localStorage.getItem(localstorage_entry_point),
      JSONStringifyReviver,
    );
  };

  this.refreshStatesList = function (selectName) {
    var select = idget(selectName);
    cleanSelect(select);
    var statesNames = getStatesList();
    statesNames.forEach(function (stateName) {
      var option = document.createElement("option");
      option.text = stateName;
      select.add(option);
    });
  };

  this.loadData = function (selectWithStateToLoadName, idOfInputToSaveState) {
    const stateToLoad = currentValue(selectWithStateToLoadName);
    esp.reset();
    cmd.reloadWith(localStorage.getItem(stateToLoad), true);
    idget(idOfInputToSaveState).value = stateToLoad;
  };

  this.importAsCurrent = function () {
    esp.reset();
    cmd.reloadWith(idget("importExportState").value, true);
  };

  this.exportCurrentState = function () {
    idget("importExportState").value = cmd.jsonRepresentation();
  };

  this.resetState = function () {
    esp.reset();
    cmd.resetState();
  };
}

//when instanciation a D3ForceGraph the
var mid = new MIDSystem();
//var storage = new StorageSystem(cmd);

//storage.refreshStatesList("selectedSavedState");
//init add IG button
mid.showAllProps();


