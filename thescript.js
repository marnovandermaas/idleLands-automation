// ==UserScript==
// @name         IdleLands Automation Script
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  A collection of automation scripts for IdleLands
// @downloadURL  https://raw.githubusercontent.com/the-crazyball/idleLands-automation/main/thescript.js
// @updateURL    https://raw.githubusercontent.com/the-crazyball/idleLands-automation/main/thescript.meta.js
// @author       Ian Duchesne (Torsin aka Crazyball)
// @match        https://play.idle.land/*
// @require      https://raw.githubusercontent.com/the-crazyball/idleLands-automation/main/gameData.js
// @resource css https://raw.githubusercontent.com/the-crazyball/idleLands-automation/main/style.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

var cssTxt = GM_getResourceText("css");
GM_addStyle (cssTxt);

/* TODO:
  - add persistence (done)
  - settings window for different sections (not completed)
  - choice selection
  - fix up raids
  - guild chat?
  - enforce personalities
  - salvage all/sell all
  - invite to guild / new users
  - seperate code in different JS files
*/

let defaultOptions = {
  guildRaidMinLevel: 1150,
  guildRaidMaxLevel: 1300,
  guildRaidItems: ['item:Crystal:Yellow','item:generated:goatly','item:generated:godly'],

  petAdventureCollectInterval: 1, // in minutes
  petAdventureEmbarkInterval: 1, // in minutes
  petAdventureTimeOut: 1000, // in milliseconds
  petAdventurePetNum: 3, // Number of pets to send per adventure (Game max is set to 3)

  petGoldCollectInterval: 5, // in minutes

  donateGoldInterval: 60, // in minutes

  optimizeEquipmentInterval: 1, // in minutes
  optimizeEquipmentStat: 'gold', // gold or xp

  // checkboxes
  optimizeEquipment: false,
  petAdventureCollect: false,
  petAdventureEmbark: false,
  petGoldCollect: false,
  freeRoll: false,
  useScrolls: false,
  donateGold: false,
  petAutoAscend: false,
  raids: false
}

const options = GM_getValue('options') == null ? defaultOptions : GM_getValue('options'); //save and persist options to the local storage

const globalData = {
  nextRaidAvailability: 0,
  canGuildRaid: false
}

const loginCheck = () => {
  return new Promise((resolve, reject) => {
    const loginCheckLoop = setInterval( () => {
        if( typeof discordGlobalCharacter === 'object' ) {
            clearInterval(loginCheckLoop);
            resolve();
        }
    }, 100);
  });
}

const guildModCheck = async () => {
  let response = await fetch('https://server.idle.land/api/guilds/name?name=' + discordGlobalCharacter.guildName);
  let data = await response.json();
  globalData.canGuildRaid = Object.values(data.guild.members).filter(x => x.name == discordGlobalCharacter.name && x.rank >= 5).length > 0
}

(async () => {
  await GM_setValue('options', options);
  await loginCheck();
  await guildModCheck();

  loadUI();
  start();
})();

const loadUI = () => {
  document.body.insertAdjacentHTML("beforeend", `
  <div id="cb-settings-container" class="cb-hide">
    <div id="cb-settings-container-header" class="cb-header">
      <span id="cb-title">Settings</span>
      <button id="cb-settings-close" class="cb-close"></button>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="flex">Optimize Equipment:</span>
        <span class="flex right">
          <select class="cb-select" id="cb-optimize-equipment-select">
            <option value="gold" ${options.optimizeEquipmentStat == 'gold' ? `selected` : ` `}>gold</option>
            <option value="xp" ${options.optimizeEquipmentStat == 'xp' ? `selected` : ` `}>xp</option>
          </select>
        </span>
      </div>
    </div>
  </div>

  <div id="cb-container">
    <div id="cb-container-header" class="cb-header">
      <span id="cb-title">IdleLands Scripts</span>
      <button class="cb-accordion cb-active"></button>
    </div>
    <div class="cb-panel">
    <div class="cb-section-header"><span id="cb-player-name"></span> the <span id="cb-player-title"></span> <button id="cb-settings-open" class="cb-settings"></button></div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="flex">Auto Free Roll</span>
        <span class="flex right">
          <label class="switch">
            <input id="free-roll-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="flex">Auto Use Scrolls</span>
        <span class="flex right">
          <label class="switch">
            <input id="use-scrolls-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="flex">Auto Donate Gold</span>
        <span class="flex right">
          <label class="switch">
            <input id="donate-gold-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="flex">Optimize Equipment</span>
        <span class="flex right">
          <label class="switch">
            <input id="optimize-equipment-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>
    <div id="cb-optimize-equipment-sub-section" class="cb-sub-section cb-collapsed">
      <div class="cb-section-content">
        <div class="flex small"><span id="optimize-equipment-message">Loading... just a sec.</span></div>
      </div>
    </div>

    <div class="cb-section-header">Pets - Adventures</div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="flex">Auto Collect</span>
        <span class="flex right">
          <label class="switch">
            <input id="pet-adventure-collect-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="flex">Auto Embark</span>
        <span class="flex right">
          <label class="switch">
            <input id="pet-adventure-embark-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>
    <div class="cb-section-header">Active Pet ( <span id="cb-pet-type"></span> - <span id="cb-pet-levels"></span> )</div>
    <div class="cb-section">
      <div class="cb-section-content">
        <div class="flex">Auto Gold Collect</div>
        <div class="flex right">
          <label class="switch">
            <input id="pet-gold-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <div class="flex">Auto Ascend</div>
        <div class="flex right">
          <label class="switch">
            <input id="pet-ascend-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>
    <div id="cb-pet-ascend-sub-section" class="cb-sub-section cb-collapsed">
      <div class="cb-section-content">
        <div class="flex small"><span id="pet-ascend-message">Loading... just a sec.</span></div>
      </div>
    </div>
    <div class="cb-section-header">Guild ( <span id="cb-guild-name"></span> )</div>
    ${
    globalData.canGuildRaid
    ? `
    <div class="cb-section">
      <div class="cb-section-content">
        <div class="flex">Auto Raid</div>
        <div class="flex right">
          <label class="switch">
            <input id="raids-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>
    <div id="cb-raids-sub-section" class="cb-sub-section cb-collapsed">
      <div class="cb-section-content">
        <div class="flex small">Next Raid @ <span id="guild-next-time">-</span></div>
        <div class="break"></div>
        <div class="flex small">Level: <span id="guild-level">-</span></div>
        <div class="break"></div>
        <div class="flex small">Reward: <span id="guild-item">-</span></div>
      </div>
    </div>`
    : `
    <div class="cb-sub-section">
      <div class="cb-section-content">
        <div class="flex small">You need to be a guild Leader or Mod to use this feature.</span></div>
      </div>
    </div>`
    }
    <div id="cb-footer">by: Torsin - <a href="https://github.com/the-crazyball/idleLands-automation#credits" target="_blank">Credits</a> - <a href="https://github.com/the-crazyball/idleLands-automation" target="_blank">GitHub</a> - <a href="https://discord.gg/vcQrf96n" target="_blank">Discord</a></div>

    </div>
  </div>
  ` );
}

const start = () => {

  const mainLoop = setInterval( () => {
    updateUI();

    if(options.petAutoAscend) petAscend(); // TODO: move out of here, no need to check in there
  }, 500);

  // Event listeners
  document.getElementById("cb-settings-close").addEventListener( 'click', function(e) {
    let el = document.getElementById("cb-settings-container");
    el.classList.toggle("cb-hide");
  });

  document.getElementById("cb-settings-open").addEventListener( 'click', function(e) {
    let el = document.getElementById("cb-settings-container");
    let style = getComputedStyle(el);
    el.style.left = (e.pageX - parseInt(style.width)) + 'px';
    el.style.top = e.pageY + 'px';

    el.classList.toggle("cb-hide");
  });

  var petAdventureCollectLoop;
  document.getElementById("pet-adventure-collect-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          petAdventureCollectLoop = setInterval( claimAdventures, 1000*60*options.petAdventureCollectInterval );
          console.log('pet adventures collect started');
          saveOptions('petAdventureCollect', true);
      } else {
          clearInterval(petAdventureCollectLoop);
          console.log('pet adventures collect stopped');
          saveOptions('petAdventureCollect', false);
      }
  });
  triggerChange('petAdventureCollect', document.getElementById("pet-adventure-collect-checkbox"));

  var petAdventureEmbarkLoop;
  document.getElementById("pet-adventure-embark-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          petAdventureEmbarkLoop = setInterval( embarkAdventures, 1000*60*options.petAdventureEmbarkInterval );
          console.log('pet adventures embark started');
          saveOptions('petAdventureEmbark', true);
      } else {
          clearInterval(petAdventureEmbarkLoop);
          console.log('pet adventures embark stopped');
          saveOptions('petAdventureEmbark', false);
      }
  });
  triggerChange('petAdventureEmbark', document.getElementById("pet-adventure-embark-checkbox"));

  var petGoldCollectLoop;
  document.getElementById("pet-gold-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          petGoldCollectLoop = setInterval( PetGoldCollect, 1000*60*options.petGoldCollectInterval );
          console.log('pet gold collection started');
          saveOptions('petGoldCollect', true);
      } else {
          clearInterval(petGoldCollectLoop);
          console.log('pet gold collection stopped');
          saveOptions('petGoldCollect', false);
      }
  });
  triggerChange('petGoldCollect', document.getElementById("pet-gold-checkbox"));

  var freeRollLoop;
  document.getElementById("free-roll-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          freeRollLoop = setInterval( FreeRoll, 1000*60 );
          console.log('free roll started');
          saveOptions('freeRoll', true);
      } else {
          clearInterval(freeRollLoop);
          console.log('free roll stopped');
          saveOptions('freeRoll', false);
      }
  });
  triggerChange('freeRoll', document.getElementById("free-roll-checkbox"));

  var useScrollsLoop;
  document.getElementById("use-scrolls-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          useScrollsLoop = setInterval( UseScrolls, 1000*60 );
          console.log('use scrolls started');
          saveOptions('useScrolls', true);
      } else {
          clearInterval(useScrollsLoop);
          console.log('use scrolls stopped');
          saveOptions('useScrolls', false);
      }
  });
  triggerChange('useScrolls', document.getElementById("use-scrolls-checkbox"));

  var donateGoldLoop;
  document.getElementById("donate-gold-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          donateGoldLoop = setInterval( DonateGold, 1000*60*options.donateGoldInterval );
          console.log('donate gold started');
          saveOptions('donateGold', true);
      } else {
          clearInterval(donateGoldLoop);
          console.log('donate gold stopped');
          saveOptions('donateGold', false);
      }
  });
  triggerChange('donateGold', document.getElementById("donate-gold-checkbox"));

  var optimizeEquipmentLoop;
  document.getElementById("optimize-equipment-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          optimizeEquipmentLoop = setInterval( OptimizeEquipment, 1000*60*options.optimizeEquipmentInterval );
          console.log('optimize equipment started');
          saveOptions('optimizeEquipment', true);
          document.getElementById("cb-optimize-equipment-sub-section").classList.toggle("cb-collapsed");
      } else {
          clearInterval(optimizeEquipmentLoop);
          console.log('optimize equipment stopped');
          saveOptions('optimizeEquipment', false);
          document.getElementById("cb-optimize-equipment-sub-section").classList.toggle("cb-collapsed");
      }
  });
  triggerChange('optimizeEquipment', document.getElementById("optimize-equipment-checkbox"));

  document.getElementById("cb-optimize-equipment-select").addEventListener( 'change', function(e) {
   options.optimizeEquipmentStat = e.target.value;
   //document.getElementById("optimize-equipment-message").innerHTML = 'Optimizing for ' + options.optimizeEquipmentStat + ' - Boost: -';
   GM_setValue('options', options);
  });

  document.getElementById("pet-ascend-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          saveOptions('petAutoAscend', true);
          console.log('pet auto ascend started');
          document.getElementById("cb-pet-ascend-sub-section").classList.toggle("cb-collapsed");
      } else {
          saveOptions('petAutoAscend', false);
          //setTimeout(function(){ document.getElementById("pet-ascend-message").innerHTML = '' }, 700);
          document.getElementById("cb-pet-ascend-sub-section").classList.toggle("cb-collapsed");
          console.log('pet auto ascend stopped');
      }
  });
  triggerChange('petAutoAscend', document.getElementById("pet-ascend-checkbox"));

  if(globalData.canGuildRaid) {
    const guildTimeEl = document.getElementById("guild-next-time");
    const guildLevelEl = document.getElementById("guild-level");
    const guildItemEl = document.getElementById("guild-item");

    var raidsLoop;
    document.getElementById("raids-checkbox").addEventListener( 'change', async function() {
          if(this.checked) {
              raidsLoop = setInterval( RunRaids, 1000*30 ); // 30 seconds for now
              console.log('raiding started');

              let guildResponse = await fetch('https://server.idle.land/api/guilds/name?name=' + discordGlobalCharacter.guildName);
              let guildData = await guildResponse.json();

              globalData.nextRaidAvailability = guildData.guild.nextRaidAvailability;
              var date = new Date(globalData.nextRaidAvailability);
              guildTimeEl.innerHTML = date.toLocaleTimeString(); //("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) + ":" + ("0" + date.getSeconds()).slice(-2);
              document.getElementById("cb-raids-sub-section").classList.toggle("cb-collapsed");
              saveOptions('raids', true);
          } else {
              clearInterval(raidsLoop);
              console.log('raiding stopped');
              guildTimeEl.innerHTML = '-';
              guildLevelEl.innerHTML = '-';
              guildItemEl.innerHTML = '-';
              document.getElementById("cb-raids-sub-section").classList.toggle("cb-collapsed");
              saveOptions('raids', false);
          }
    });
    triggerChange('raids', document.getElementById("raids-checkbox"));
  }

  // Make the whole container draggable
  dragElement(document.getElementById("cb-settings-container"));
  dragElement(document.getElementById("cb-container"));

  // Accordion
  var acc = document.getElementsByClassName("cb-accordion");
  var panel = document.getElementsByClassName("cb-panel");
  panel[0].style.maxHeight = panel[0].scrollHeight + "px";

    acc[0].addEventListener("click", function() {
      this.classList.toggle("cb-active");
      var panel = document.getElementsByClassName("cb-panel");
      if (panel[0].style.maxHeight) {
        panel[0].style.maxHeight = null;
         panel[0].style.overflow = 'hidden';
      } else {
        panel[0].style.maxHeight = panel[0].scrollHeight + "px";
         panel[0].style.overflow = null;
      }
    });

  // Draggable
  function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "-header")) {
      // if present, the header is where you move the DIV from:
      document.getElementById(elmnt.id + "-header").onmousedown = dragMouseDown;
    } else {
      // otherwise, move the DIV from anywhere inside the DIV:
      elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
      // stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
}
  // Pet ascend
  const petAscend = () => {

    let pet = discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet];

    if(pet.level.maximum != pet.level.__current) {
        document.getElementById("pet-ascend-message").innerHTML = 'Ah, the waiting game for max level to be reached!';
        return false;
    }
    if(pet.rating >= 5) {
        document.getElementById("pet-ascend-message").innerHTML = `This pet has reached it's maximum level capacity, this is a good thing! Try maxing out other pets.`;
        return false;
    }
    let someMaterialsMissing = Object.keys(pet.$ascMaterials).some((mat) => pet.$ascMaterials[mat] > (discordGlobalCharacter.$petsData.ascensionMaterials[mat] || 0))
    if(someMaterialsMissing) {
        document.getElementById("pet-ascend-message").innerHTML = 'Oops, you are missing materials';
        return false;
    }

    // get gold before ascend
    setTimeout( () => { unsafeWindow.__emitSocket('pet:takegold') }, 200)
    // then ascend
    setTimeout( () => { unsafeWindow.__emitSocket("pet:ascend") }, 500);
  }

  // Pet adventures
  const claimAdventures = () => {

      // get expired adventures and claim
      let adventuresFinished = Object.values(discordGlobalCharacter.$petsData.adventures).filter(x => (x.finishAt <= Date.now()) && x.finishAt != 0);

      if (adventuresFinished.length) {
        for (let i = 0; i < adventuresFinished.length; i++) {
          let currentAdventure = adventuresFinished[i];

          setTimeout( () => {
            unsafeWindow.__emitSocket("pet:adventure:finish", { adventureId: currentAdventure.id }); // Collect
          }, options.petAdventureTimeOut * i);
        }
      }
  }
  const embarkAdventures = () => {

      // assign pets to adventures
      let adventuresNotStarted = Object.values(discordGlobalCharacter.$petsData.adventures).filter(x => !x.finishAt);

      if (adventuresNotStarted.length) {
        for (let i = 0; i < adventuresNotStarted.length; i++) {
          let currentAdventure = adventuresNotStarted[i];

          setTimeout( () => {
            let pets = discordGlobalCharacter.$petsData.allPets;
            let petsTemp = [];

            let filter = Object.entries(pets).reduce((acc, [key, value]) => {
              if (!value.currentAdventureId) return [...acc, key];
              return acc;
            }, [])

            if (filter.length) {
              let maxPets = filter.length > options.petAdventurePetNum ? options.petAdventurePetNum : filter.length;
              for (let i = 0; i < maxPets; i++) {
                petsTemp.push(filter[i]);
              }
              unsafeWindow.__emitSocket("pet:adventure:embark", { adventureId: currentAdventure.id, petIds: petsTemp });
            }
          }, options.petAdventureTimeOut * i);
        }
      }
  }

  // Raids
  const RunRaids = async () => {

    if(globalData.nextRaidAvailability <= Date.now()) {

        let level = 0;
        let reward = '';

        let response = await fetch('https://server.idle.land/api/guilds/raids?maxLevel=' + options.guildRaidMaxLevel);
        let data = await response.json();

        let results = data.raids.filter(element => {
            return element.rewards.some(r => options.guildRaidItems.includes(r)) && (element.level >= options.guildRaidMinLevel && element.level <= options.guildRaidMaxLevel);
        });

        if (results.length > 0) {
            level = results[results.length-1].level;
            reward = rewards[results[results.length-1].rewards[0]];
        } else {
            level = options.guildRaidMaxLevel;
            reward = rewards[data.raids[data.raids.length-1].rewards[0]];
        }

        setTimeout( () => {unsafeWindow.__emitSocket("guild:raidboss", { bossLevel: level})}, 2000);

        // need to get the actual next raid time from the server after the raid completion
        setTimeout(async () => {
            let guildResponse = await fetch('https://server.idle.land/api/guilds/name?name=' + discordGlobalCharacter.guildName);
            let guildData = await guildResponse.json();
            var date = new Date(guildData.guild.nextRaidAvailability);

            globalData.nextRaidAvailability = guildData.guild.nextRaidAvailability;

            document.getElementById("guild-next-time").innerHTML = date.toLocaleTimeString(); //("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) + ":" + ("0" + date.getSeconds()).slice(-2);
            document.getElementById("guild-level").innerHTML = level;
            document.getElementById("guild-item").innerHTML = reward;
        }, 10000); // added 5 seconds extra from the 5 seconds for the combat to initiate
    }
  }

  const UseScrolls = () => {
    let delay = 200;
    let scrolls = discordGlobalCharacter.$inventoryData.buffScrolls
    scrolls.forEach(element => {
      setTimeout( () => {
        unsafeWindow.__emitSocket('item:buffscroll', { scrollId: element.id })
      }, delay);
      delay += 1000;
    })
  }

  const OptimizeEquipment = () => {

    let delay = 200
    let currentEquipment = discordGlobalCharacter.$inventoryData.equipment
    let currentInventory = discordGlobalCharacter.$inventoryData.items

    currentInventory.forEach(element => {
      let slot = element.type
      let newItemStat = element.stats[options.optimizeEquipmentStat] || 0
      let oldItemStat = currentEquipment[slot].stats[options.optimizeEquipmentStat] || 0
      if(newItemStat > oldItemStat) {
        setTimeout( () => {
          unsafeWindow.__emitSocket('item:equip', { itemId: element.id })
        }, delay);
        delay += 1000;
      }
    })

  }

  const FreeRoll = () => {
    if(discordGlobalCharacter.$premiumData.gachaFreeRolls["Astral Gate"] <= Date.now()) {
      let gachaName = 'AstralGate';
      let numRolls = 10;
      setTimeout( () => {unsafeWindow.__emitSocket('astralgate:roll', { astralGateName: gachaName, numRolls }) }, 500);
    }
  }
  const PetGoldCollect = () => {
    setTimeout( () => {unsafeWindow.__emitSocket("pet:takegold")}, 500);
  }
  const DonateGold = () => {
    setTimeout( () => {unsafeWindow.__emitSocket("guild:donateresource", { resource: 'gold', amount: discordGlobalCharacter.gold })}, 500);
  }


const triggerChange = (option, element) => {
  if(options[option]) {
    //let element1 = document.getElementById("optimize-equipment-checkbox");
    element.checked = true;

    var event = document.createEvent('HTMLEvents');
    event.initEvent('change', false, true);

    element.dispatchEvent(event);
  }
}

const saveOptions = (option, val) => {
  options[option] = val;
  GM_setValue('options', options);
}

// number function
const formatNumber = (num) => {
  var num_parts = num.toString().split(".");
  num_parts[0] = num_parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return num_parts.join(".");
}
const updateUI = () => {
    document.getElementById("optimize-equipment-message").innerHTML = 'Optimized for ' + options.optimizeEquipmentStat + ' - Boost: ' + formatNumber(discordGlobalCharacter.stats[options.optimizeEquipmentStat]);
    document.getElementById("cb-player-name").innerHTML = discordGlobalCharacter.name;
    document.getElementById("cb-player-title").innerHTML = discordGlobalCharacter.title;
    document.getElementById("cb-guild-name").innerHTML = discordGlobalCharacter.guildName ? discordGlobalCharacter.guildName : 'Not part of guild';
    document.getElementById("cb-pet-type").innerHTML = discordGlobalCharacter.$petsData.currentPet;
    document.getElementById("cb-pet-levels").innerHTML = discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet].level.__current + '/' + discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet].level.maximum;
}
