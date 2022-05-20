// ==UserScript==
// @name         IdleLands Automation Script
// @namespace    https://github.com/marnovandermaas/idleLands-automation
// @version      2.0
// @description  A collection of automation scripts for IdleLands
// @downloadURL  https://raw.githubusercontent.com/marnovandermaas/idleLands-automation/main/thescript.js
// @updateURL    https://raw.githubusercontent.com/marnovandermaas/idleLands-automation/main/thescript.meta.js
// @author       Torsin and Marno
// @copyright    2020-2022 Torsin and Marno
// @match        https://play.idle.land/*
// @require      https://raw.githubusercontent.com/marnovandermaas/idleLands-automation/main/utils.js
// @require      https://raw.githubusercontent.com/marnovandermaas/idleLands-automation/main/gameData.js
// @require      https://raw.githubusercontent.com/lodash/lodash/4.17.20/dist/lodash.js
// @resource css https://raw.githubusercontent.com/marnovandermaas/idleLands-automation/main/style.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

// Javascript Lint hints
/* globals discordGlobalCharacter, formatDdList, timeConversion, formatNumber, saveOptions, triggerChange, dragElement, accordionElement, tabsNav, raidRewards */

// #######################################################################################################################################################################
// Source code:
//   https://github.com/marnovandermaas/idleLands-automation
//
// Well deserved credits to:
//   Torsin - For creating this script originally
//   Anten - For his ideas to improve the script and testing
//   Sarimash - For showing me his first script (then others) that ignited my curiosity to build this. Oh and testing as well
//   skepticfx - For the wsHook.js (https://github.com/skepticfx/wshook) script that I modified because of grant permissions used in this script
//
// Changelog (adapted from changelog.txt):
//  2.0
//    - Added Quest Reroll logic and toggle to enable it
//    - Added settings to control quest reroll
//    - Added pot buying logic and toggle to enable it
//    - Added minimum item score for finding and buying choices
//    - Added divine stumbler that checks cooldowns
//    - Added divine stumbler looping
//    - Added option to donate portion of gold
//    - Move from crazyball's GitHub to marnovandermaas GitHub
//  1.7
//    - Fixed the guild raids to throttle when failing, add 10 mins to next raid availability
//        this way it doesn't spam the server and doesn't use up all the gold
//    - Auto pet ability when player has enough stamina it triggers the ability
//    - Added new tab panel for DivineStumbler in settings (not fully implemented yet)
//  1.6
//    - Fixed guild raid reward display for multiple rewards
//    - Auto Choices
//    - Fixed guild raid reward and level display when picking a lower level after fail
//    - Added vertical tabs for different sections in the settings window
//    - Inventory cleanup (Salvage All, or Sell All)

//#######################################################################################################################################################################

var cssTxt = GM_getResourceText('css');
GM_addStyle (cssTxt);

let defaultOptions = {
  guildRaidMinLevel: 100,
  guildRaidMaxLevel: 100,
  guildRaidItems: ['item:Crystal:Yellow','item:generated:goatly',''],
  guildRaidNextAvailability: 0,

  petAdventureCollectInterval: 60000, // in ms
  petAdventureEmbarkInterval: 60000, // in ms
  petAbilityInterval: 15000, // 15 secs
  petAdventurePetNum: 3, // Number of pets to send per adventure (Game max is set to 3)

  petGoldCollectInterval: 300000, // in ms
  buyPotInterval: 300000, // in ms
  petAutoAscendInterval: 60000, // in ms
  petOptimizeEquipmentInterval: 30000,
  petOptimizeEquipmentStat: 'xp', // gold, xp or by score

  donateGoldInterval: 3600000, // in ms
  goldDonateRatio: 1.0, // 1 means all gold donated, 0 means none

  guildRaidInterval: 30000, // 30 secs, in ms

  useScrollsInterval: 60000,

  rerollQuestsInterval: 500,

  optimizeEquipmentInterval: 60000, // in ms
  optimizeEquipmentStat: 'gold', // gold or xp

  inventoryInterval: 10000,
  inventoryCleanup: 'none',

  // choices
  choicesInterval: 10000,

  choiceTrainerOption: 'none',
  choicePortalOption: 'none',
  choiceGamblingOption: 'none',
  choicePartyLeaveOption: 'none',
  choiceBuyItemOption: 'none',
  choiceItemFoundOption: 'none',
  choiceEnchantOption: 'none',
  choiceItemMinScore: 0,

  // quests
  questTreasureScalar:    2,
  questCollectibleScalar: 2,
  questSellScalar:        1,
  questSalvageScalar:     1,
  questCombatScalar:      1,
  questStaminaScalar:     2,
  questGainScalar:        4,
  questSpendScalar:       4,
  questStepScalar:        2,

  // checkboxes
  optimizeEquipment: false,
  petAdventureCollect: false,
  petAdventureEmbark: false,
  petGoldCollect: false,
  buyPot: false,
  freeRoll: false,
  useScrolls: false,
  donateGold: false,
  petAutoAscend: false,
  raids: false,
  choices: false,
  inventory: false,
  petAbility: false,
  rerollQuests: false,

  // divine direction
  divineDirectionInterval: 1000,

  ddEnable: false,
  ddLoop: true,
  ddCheckCooldown: false,
  ddSelectedPathName: 'none',
  ddPaths: {}
}

const options = GM_getValue('options') == null ? defaultOptions : GM_getValue('options'); //save and persist options to the local storage

// check for object keys and add if they don't exist, prevents re-install of this script or if removed from the local storage
Object.keys(defaultOptions).forEach(key => {
  if(!options.hasOwnProperty( key )) {
    options[key] = defaultOptions[key];
    GM_setValue('options', options);
  }
});

const globalData = {
  canGuildRaid: false,
  raidFail: false,
  lastRaidBossLevel: 0,
  raidFailTimes: 0,
  divineDirectionIndex: 0
}

const loginCheck = () => {
  return new Promise((resolve, reject) => {
    const loginCheckLoop = setInterval( () => {
        // check for discordGlobalCharacter object and if we are passed login page
        // (there are instances where the player object is loaded but stays on the login screen and errors out)
        if( typeof discordGlobalCharacter === 'object' && document.querySelector('.ion-margin-bottom > ion-list:nth-child(1)') !== null) {
            clearInterval(loginCheckLoop);
            resolve();
        }
    }, 100);
  });
}

const guildModCheck = async () => {
  if(discordGlobalCharacter.guildName) {
    let guild = await getGuildData();
    globalData.canGuildRaid = Object.values(guild.members).filter(x => x.name == discordGlobalCharacter.name && x.rank >= 5).length > 0
  }
}

(async () => {
  await loginCheck();
  await guildModCheck();
  loadUI();
  start();
})();

const getGuildRaidMaxLevel = async () => {
 let guild = await getGuildData();
 return 100 + ((guild.buildingLevels['active:raidportal'] - 1) * 50);
}

const buildMinRaidOptions = async () => {
  let values = '';
  let maxLevel = await getGuildRaidMaxLevel();
  for(let i = 100; i <= maxLevel; i += 50) {
    values += `<option value="${i}" ${options.guildRaidMinLevel == i ? 'selected' : ''}>${i}</option>`
  }
  return values;
}

const buildMaxRaidOptions = async () => {
  let values = '';
  let maxLevel = await getGuildRaidMaxLevel();

  for(let i = 100; i <= maxLevel; i += 50) {
    values += `<option value="${i}" ${options.guildRaidMaxLevel == i ? 'selected' : ''}>${i}</option>`
  }
  return values;
}

const buildRaidItemOptions = (slot) => {
  let values = `<option value=""></option>`;

  Object.keys(raidRewards).forEach(key => {
    values += `<option value="${key}" ${options.guildRaidItems[slot] == key ? 'selected' : ''}>${raidRewards[key]}</option>`
  });
  return values;
}

const populateDivinePathOptions = () => {
  let values = `<option value="none" ${options.ddSelectedPathName == 'none' ? 'selected' : ''}></option>`;
  let deleteValues = `<option value="none" selected></option>`;

  Object.keys(options.ddPaths).forEach(key => {
    values += `<option value="${key}" ${options.ddSelectedPathName == key ? 'selected' : ''}>${key}</option>`;
    deleteValues += `<option value="${key}"}>${key}</option>`;
  });

  document.getElementById('cb-divine-path-select').innerHTML = values;
  document.getElementById('cb-divine-path-delete-select').innerHTML = deleteValues;
}

const loadUI = () => {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="cb-settings-container" class="cb-hide">
      <div id="cb-settings-container-header" class="cb-header"> <span class="cb-title text-border-light">Settings</span>
        <button id="cb-settings-close" class="cb-close"></button>
      </div>
      <div id="cb-settings-panel" class="cb-panel" style="max-height: 100%; display: flex; flex-wrap: wrap;">
        <div class="cb-left-pane">
          <nav class="tabs">
            <ul>
              <li class="cb-general-big-ico active" data-tab="cb-tab-settings-general">General</li>
              <li class="cb-choices-big-ico" data-tab="cb-tab-settings-choices">Choices</li>
              <li class="cb-quests-big-ico" data-tab="cb-tab-settings-quests">Quests</li>
              <li class="cb-interval-big-ico" data-tab="cb-tab-settings-intervals">Intervals</li>
              <li class="cb-guild-big-ico" data-tab="cb-tab-settings-guild">Guild</li>
              <li class="cb-divine-path-big-ico" data-tab="cb-tab-settings-divine-path">Stumbler</li>
            </ul>
          </nav>
        </div>
        <div class="cb-right-pane" style="width:290px">
          <div class="tab-content active" id="cb-tab-settings-general">
            <div class="cb-section-header">General</div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Gold Donate Ratio:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-gold-donate-ratio-select">
                    <option value="0.1" ${options.goldDonateRatio == 0.1 ? `selected` : ``}>0.1</option>
                    <option value="0.2" ${options.goldDonateRatio == 0.2 ? `selected` : ``}>0.2</option>
                    <option value="0.3" ${options.goldDonateRatio == 0.3 ? `selected` : ``}>0.3</option>
                    <option value="0.4" ${options.goldDonateRatio == 0.4 ? `selected` : ``}>0.4</option>
                    <option value="0.5" ${options.goldDonateRatio == 0.5 ? `selected` : ``}>0.5</option>
                    <option value="0.6" ${options.goldDonateRatio == 0.6 ? `selected` : ``}>0.6</option>
                    <option value="0.7" ${options.goldDonateRatio == 0.7 ? `selected` : ``}>0.7</option>
                    <option value="0.8" ${options.goldDonateRatio == 0.8 ? `selected` : ``}>0.8</option>
                    <option value="0.9" ${options.goldDonateRatio == 0.9 ? `selected` : ``}>0.9</option>
                    <option value="1.0" ${options.goldDonateRatio == 1.0 ? `selected` : ``}>1.0</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Optimize Equipment:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-optimize-equipment-select">
                    <option value="gold" ${options.optimizeEquipmentStat == 'gold' ? `selected` : ``}>gold</option>
                    <option value="xp" ${options.optimizeEquipmentStat == 'xp' ? `selected` : ``}>xp</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Pets per Adventure:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-pets-per-select">
                    <option value="1" ${options.petAdventurePetNum == 1 ? `selected` : ``}>1</option>
                    <option value="2" ${options.petAdventurePetNum == 2 ? `selected` : ``}>2</option>
                    <option value="3" ${options.petAdventurePetNum == 3 ? `selected` : ``}>3</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Pet Optimize Equipment:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-pet-optimize-equipment-select">
                    <option value="gold" ${options.petOptimizeEquipmentStat == 'gold' ? `selected` : ``}>gold</option>
                    <option value="xp" ${options.petOptimizeEquipmentStat == 'xp' ? `selected` : ``}>xp</option>
                    <option value="score" ${options.petOptimizeEquipmentStat == 'score' ? `selected` : ``}>score</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Inventory Cleanup:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-inventory-cleanup-select">
                    <option value="none" ${options.inventoryCleanup == 'none' ? `selected` : ``}>none</option>
                    <option value="salvage" ${options.inventoryCleanup == 'salvage' ? `selected` : ``}>salvage</option>
                    <option value="sell" ${options.inventoryCleanup == 'sell' ? `selected` : ``}>sell</option>
                  </select>
                </span>
              </div>
            </div>
            <div id="cb-inventory-cleanup-sub-section" class="cb-sub-section">
              <div class="cb-section-content">
                <div class="cb-flex-1 small">Please note inventory cleanup will only trigger when the inventory is full.</div>
              </div>
            </div>
          </div>
          <div class="tab-content" id="cb-tab-settings-choices">
            <div class="cb-section-header">Choices</div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Enchantments:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-choice-enchant-select">
                    <option value="none" ${options.choiceEnchantOption == 'none' ? `selected` : ``}>none</option>
                    <option value="Yes" ${options.choiceEnchantOption == 'Yes' ? `selected` : ``}>yes</option>
                    <option value="No" ${options.choiceEnchantOption == 'No' ? `selected` : ``}>no</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Found Item (Equip):</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-choice-item-found-select">
                    <option value="none" ${options.choiceItemFoundOption == 'none' ? `selected` : ``}>none</option>
                    <option value="Yes" ${options.choiceItemFoundOption == 'Yes' ? `selected` : ``}>yes</option>
                    <option value="No" ${options.choiceItemFoundOption == 'No' ? `selected` : ``}>no</option>
                    <option value="Sell" ${options.choiceItemFoundOption == 'Sell' ? `selected` : ``}>sell</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Buy Item (Merchant):</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-choice-buy-item-select">
                    <option value="none" ${options.choiceBuyItemOption == 'none' ? `selected` : ``}>none</option>
                    <option value="Yes" ${options.choiceBuyItemOption == 'Yes' ? `selected` : ``}>yes</option>
                    <option value="No" ${options.choiceBuyItemOption == 'No' ? `selected` : ``}>no</option>
                    <option value="Inventory" ${options.choiceBuyItemOption == 'Inventory' ? `selected` : ``}>inventory</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Item Minimum Score:</span>
                <span class="right">
                  <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-choice-item-min-score-text">
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Party Leave:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-choice-party-leave-select">
                    <option value="none" ${options.choicePartyLeaveOption == 'none' ? `selected` : ``}>none</option>
                    <option value="Yes" ${options.choicePartyLeaveOption == 'Yes' ? `selected` : ``}>yes</option>
                    <option value="No" ${options.choicePartyLeaveOption == 'No' ? `selected` : ``}>no</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Gambling:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-choice-gambling-select">
                    <option value="none" ${options.choiceGamblingOption == 'none' ? `selected` : ``}>none</option>
                    <option value="Yes" ${options.choiceGamblingOption == 'Yes' ? `selected` : ``}>yes</option>
                    <option value="No" ${options.choiceGamblingOption == 'No' ? `selected` : ``}>no</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Portal:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-choice-portal-select">
                    <option value="none" ${options.choicePortalOption == 'none' ? `selected` : ``}>none</option>
                    <option value="Yes" ${options.choicePortalOption == 'Yes' ? `selected` : ``}>yes</option>
                    <option value="No" ${options.choicePortalOption == 'No' ? `selected` : ``}>no</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Trainer:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-choice-trainer-select">
                    <option value="none" ${options.choiceTrainerOption == 'none' ? `selected` : ``}>none</option>
                    <option value="Yes" ${options.choiceTrainerOption == 'Yes' ? `selected` : ``}>yes</option>
                    <option value="No" ${options.choiceTrainerOption == 'No' ? `selected` : ``}>no</option>
                  </select>
                </span>
              </div>
            </div>
          </div>
          <div class="tab-content" id="cb-tab-settings-quests">
            <div class="cb-section-header">Quests</div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Treasure:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-quest-treasure-select">
                    <option value="2" ${options.questTreasureScalar == 2 ? `selected` : ``}>All</option>
                    <option value="3" ${options.questTreasureScalar == 3 ? `selected` : ``}>&gt;25</option>
                    <option value="4" ${options.questTreasureScalar == 4 ? `selected` : ``}>&gt;125</option>
                    <option value="5" ${options.questTreasureScalar == 5 ? `selected` : ``}>&gt;625</option>
                    <option value="6" ${options.questTreasureScalar == 6 ? `selected` : ``}>None</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Collectible:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-quest-collectible-select">
                    <option value="2" ${options.questCollectibleScalar == 2 ? `selected` : ``}>All</option>
                    <option value="3" ${options.questCollectibleScalar == 3 ? `selected` : ``}>&gt;25</option>
                    <option value="4" ${options.questCollectibleScalar == 4 ? `selected` : ``}>&gt;125</option>
                    <option value="5" ${options.questCollectibleScalar == 5 ? `selected` : ``}>&gt;625</option>
                    <option value="6" ${options.questCollectibleScalar == 6 ? `selected` : ``}>None</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Sell Items:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-quest-sell-select">
                    <option value="1" ${options.questSellScalar == 1 ? `selected` : ``}>All</option>
                    <option value="2" ${options.questSellScalar == 2 ? `selected` : ``}>&gt;5</option>
                    <option value="3" ${options.questSellScalar == 3 ? `selected` : ``}>&gt;25</option>
                    <option value="4" ${options.questSellScalar == 4 ? `selected` : ``}>None</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Salvage Items or Resources:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-quest-salvage-select">
                    <option value="1" ${options.questSalvageScalar == 1 ? `selected` : ``}>All</option>
                    <option value="2" ${options.questSalvageScalar == 2 ? `selected` : ``}>&gt;5 or 10k</option>
                    <option value="3" ${options.questSalvageScalar == 3 ? `selected` : ``}>&gt;25 or 1,000k</option>
                    <option value="4" ${options.questSalvageScalar == 4 ? `selected` : ``}>None</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Battles:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-quest-combat-select">
                    <option value="1" ${options.questCombatScalar == 1 ? `selected` : ``}>All</option>
                    <option value="2" ${options.questCombatScalar == 2 ? `selected` : ``}>&gt;2</option>
                    <option value="3" ${options.questCombatScalar == 3 ? `selected` : ``}>&gt;4</option>
                    <option value="4" ${options.questCombatScalar == 4 ? `selected` : ``}>None</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Stamina Spend:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-quest-stamina-select">
                    <option value="2" ${options.questStaminaScalar == 2 ? `selected` : ``}>All</option>
                    <option value="3" ${options.questStaminaScalar == 3 ? `selected` : ``}>&gt;25</option>
                    <option value="4" ${options.questStaminaScalar == 4 ? `selected` : ``}>&gt;125</option>
                    <option value="5" ${options.questStaminaScalar == 5 ? `selected` : ``}>None</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Gold Gain:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-quest-gain-select">
                    <option value="3" ${options.questGainScalar == 3 ? `selected` : ``}>All</option>
                    <option value="4" ${options.questGainScalar == 4 ? `selected` : ``}>&gt;1,000,000</option>
                    <option value="5" ${options.questGainScalar == 5 ? `selected` : ``}>None</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Gold Spend:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-quest-spend-select">
                    <option value="3" ${options.questSpendScalar == 3 ? `selected` : ``}>All</option>
                    <option value="4" ${options.questSpendScalar == 4 ? `selected` : ``}>&gt;1,000,000</option>
                    <option value="5" ${options.questSpendScalar == 5 ? `selected` : ``}>None</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Steps:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-quest-step-select">
                    <option value="2" ${options.questStepScalar == 2 ? `selected` : ``}>All</option>
                    <option value="3" ${options.questStepScalar == 3 ? `selected` : ``}>&gt;100</option>
                    <option value="4" ${options.questStepScalar == 4 ? `selected` : ``}>&gt;1,000</option>
                    <option value="5" ${options.questStepScalar == 5 ? `selected` : ``}>&gt;10,000</option>
                    <option value="6" ${options.questStepScalar == 6 ? `selected` : ``}>&gt;100,000</option>
                    <option value="7" ${options.questStepScalar == 7 ? `selected` : ``}>None</option>
                  </select>
                </span>
              </div>
            </div>
            <div id="cb-quest-select-sub-section" class="cb-sub-section">
              <div class="cb-section-content">
                <div class="cb-flex-1 small">
                  Quests will reroll if the value of the objective is greater than your selection.
                  Select All if you want to avoid quests with this objective and None if quests should not be rerolled because of that objective.
                </div>
              </div>
            </div>
          </div>
          <div class="tab-content" id="cb-tab-settings-intervals">
            <div class="cb-section-header">Intervals ( in ms )</div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Use Scrolls:</span>
                <span class="right">
                  <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-use-scrolls-text">
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Donate Gold:</span>
                <span class="right">
                  <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-donate-gold-text">
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Optimize Equipment:</span>
                <span class="right">
                  <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-optimize-equipment-text">
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Check Choices:</span>
                <span class="right">
                  <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-choices-interval-text">
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Reroll Quests:</span>
                <span class="right">
                  <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-reroll-quests-text">
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Buy Pots:</span>
                <span class="right">
                  <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-buy-pot-text">
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Pets Adventures Collect:</span>
                <span class="right">
                  <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-pet-adventure-collect-text">
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Pets Adventures Embark:</span>
                <span class="right">
                  <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-pet-adventure-embark-text">
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Pet Gold Collect:</span>
                <span class="right">
                  <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-pet-gold-collect-text">
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Pet Auto Ascent:</span>
                <span class="right">
                  <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-pet-auto-ascend-text">
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Pet Optimize Equipment:</span>
                <span class="right">
                  <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-pet-optimize-equipment-text">
                </span>
              </div>
            </div>
            <div class="cb-section" id="cb-guild-raid-interval-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Guild Raid:</span>
                <span class="right">
                  <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-guild-raid-text">
                </span>
              </div>
            </div>
          </div>
          <div class="tab-content" id="cb-tab-settings-guild">
            <div class="cb-section-header">Guild Raid</div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Boss Levels:</span>
                <span class="right">
                  Min: <select class="cb-select" id="cb-min-raid-select"></select>
                  Max: <select class="cb-select" id="cb-max-raid-select"></select>
                </span>
              </div>
            </div>
            <div class="cb-section">
              <div class="cb-section-content">
                <span class="cb-flex-1">Reward Item #1:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-raid-item-select"></select>
                </span>
              </div>
              <div class="cb-section-content">
                <span class="cb-flex-1">Reward Item #2:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-raid-item-2-select"></select>
                </span>
              </div>
              <div class="cb-section-content">
                <span class="cb-flex-1">Reward Item #3:</span>
                <span class="cb-flex-1 right">
                  <select class="cb-select" id="cb-raid-item-3-select"></select>
                </span>
              </div>
            </div>
          </div>
          <div class="tab-content" id="cb-tab-settings-divine-path">
            <div class="cb-section-header">Divine Stumbler</div>
            <div class="cb-sub-section">
              <div class="cb-section-content">
                <div class="cb-flex-1 small">Full credit to <a href="https://github.com/skepticfx/wshook" target="_blank">skepticfx</a> for creating the original DivineStumbler that I integrated in my own scripts with a few changes.</div>
              </div>
              <div class="cb-section">
                <div class="cb-section-content">
                  <span class="cb-flex-1">Loop</span>
                  <span class="cb-flex-1 right">
                    <label class="switch">
                      <input id="divine-path-form-loop-checkbox" type="checkbox">
                      <span class="slider round"></span>
                    </label>
                  </span>
                </div>
              </div>
              <div class="cb-section">
                <div class="cb-section-content">
                  <span class="cb-flex-1">Check Cooldown</span>
                  <span class="cb-flex-1 right">
                    <label class="switch">
                      <input id="divine-path-form-cooldown-checkbox" type="checkbox">
                      <span class="slider round"></span>
                    </label>
                  </span>
                </div>
              </div>
            </div>
            <div class="cb-section-header">Path(s) <button id="cb-settings-divine-path-add" class="cb-divine-path-add-ico cb-fr tooltip" tooltip="Add a new divine path."></button></div>
            <div id="cb-sub-section-divine-path-form" class="cb-hide">
              <div class="cb-section">
                <div class="cb-section-content">
                  <span class="cb-flex-1">Name:</span>
                  <span class="right">
                    <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="divine-path-form-name-text">
                  </span>
                </div>
              </div>
              <div class="cb-section">
                <div class="cb-section-content">
                  <div class="cb-flex-1">
                    <textarea id="divine-path-form-input-text" style="padding: 5px; resize: none; width: 100%; height: 190px;"></textarea>
                  </div>
                </div>
              </div>
            </div>
            <div id="cb-sub-section-divine-path-select" class="cb-sub-section">
              <div class="cb-section">
                <div class="cb-section-content">
                  <div class="cb-flex-1 small">Click the <span class="cb-divine-path-add-ico"></span> to add a path.</div>
                </div>
              </div>
              <div class="cb-section">
                <div class="cb-section-content">
                  <span class="cb-flex-1">Current path name:</span>
                  <span class="cb-flex-1 right" id="cb-divine-path-selected-path-name">${options.ddSelectedPathName}</span>
                </div>
              </div>
              <div class="cb-section">
                <div class="cb-section-content">
                  <span class="cb-flex-1">Path select:</span>
                  <span class="cb-flex-1 right">
                    <select class="cb-select" id="cb-divine-path-select">
                      <option>No paths</option>
                    </select>
                  </span>
                </div>
              </div>
              <div class="cb-section">
                <div class="cb-section-content">
                  <span class="cb-flex-1">Remove path:</span>
                  <span class="cb-flex-1 right">
                    <select class="cb-select" id="cb-divine-path-delete-select">
                      <option>No paths</option>
                    </select>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="cb-container">
      <div id="cb-container-header" class="cb-header">
        <span class="cb-title text-border-light">IdleLands Automation</span>
        <button class="cb-accordion cb-active"></button>
      </div>
      <div class="cb-panel">
        <div class="cb-section-header"><span id="cb-player-name"></span> the <span id="cb-player-title"></span> <button id="cb-settings-open" class="cb-settings"></button></div>
        <div class="cb-section">
          <div class="cb-section-content">
            <span class="cb-flex-1">Auto Free Roll</span>
            <span class="cb-flex-1 right">
              <label class="switch">
                <input id="free-roll-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </span>
          </div>
        </div>
        <div class="cb-section">
          <div class="cb-section-content">
            <span class="cb-flex-1">Auto Use Scrolls</span>
            <span class="cb-flex-1 right">
              <label class="switch">
                <input id="use-scrolls-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </span>
          </div>
        </div>
        <div class="cb-section">
          <div class="cb-section-content">
            <span class="cb-flex-1">Auto Donate Gold</span>
            <span class="cb-flex-1 right">
              <label class="switch">
                <input id="donate-gold-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </span>
          </div>
        </div>
        <div class="cb-section">
          <div class="cb-section-content">
            <span class="cb-flex-1">Optimize Equipment</span>
            <span class="cb-flex-1 right">
              <label class="switch">
                <input id="optimize-equipment-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </span>
          </div>
        </div>
        <div id="cb-optimize-equipment-sub-section" class="cb-sub-section cb-collapsed">
          <div class="cb-section-content">
            <div class="cb-flex-1 small"><span id="optimize-equipment-message">Loading... just a sec.</span></div>
          </div>
        </div>
        <div class="cb-section">
          <div class="cb-section-content">
            <span class="cb-flex-1">Auto Choices</span>
            <span class="cb-flex-1 right">
              <label class="switch">
                <input id="choices-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </span>
          </div>
        </div>
        <div class="cb-section">
          <div class="cb-section-content">
            <span class="cb-flex-1">Auto Inventory Cleanup</span>
            <span class="cb-flex-1 right">
              <label class="switch">
                <input id="inventory-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </span>
          </div>
        </div>
        <div class="cb-section">
          <div class="cb-section-content">
            <span class="cb-flex-1">Divine Stumbler</span>
            <span class="cb-flex-1 right">
              <label class="switch">
                <input id="divine-path-form-enabled-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </span>
          </div>
        </div>
        <div class="cb-section-header">Quests</div>
        <div class="cb-section">
          <div class="cb-section-content">
            <span class="cb-flex-1">Auto Reroll Quests</span>
            <span class="cb-flex-1 right">
              <label class="switch">
                <input id="reroll-quests-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </span>
          </div>
        </div>
        <div class="cb-section">
          <div class="cb-section-content">
            <span class="cb-flex-1">Auto Buy Pots</span>
            <span class="cb-flex-1 right">
              <label class="switch">
                <input id="buy-pots-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </span>
          </div>
        </div>
        <div class="cb-section-header">Pets - Adventures</div>
        <div class="cb-section">
          <div class="cb-section-content">
            <span class="cb-flex-1">Auto Collect</span>
            <span class="cb-flex-1 right">
              <label class="switch">
                <input id="pet-adventure-collect-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </span>
          </div>
        </div>
        <div class="cb-section">
          <div class="cb-section-content">
            <span class="cb-flex-1">Auto Embark</span>
            <span class="cb-flex-1 right">
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
            <div class="cb-flex-1">Auto Ability</div>
            <div class="cb-flex-1 right">
              <label class="switch">
                <input id="pet-ability-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </div>
          </div>
        </div>
        <div class="cb-section">
          <div class="cb-section-content">
            <div class="cb-flex-1">Auto Gold Collect</div>
            <div class="cb-flex-1 right">
              <label class="switch">
                <input id="pet-gold-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </div>
          </div>
        </div>
        <div class="cb-section">
          <div class="cb-section-content">
            <div class="cb-flex-1">Auto Ascend</div>
            <div class="cb-flex-1 right">
              <label class="switch">
                <input id="pet-ascend-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </div>
          </div>
        </div>
        <div id="cb-pet-ascend-sub-section" class="cb-sub-section cb-collapsed">
          <div class="cb-section-content">
            <div class="cb-flex-1 small"><span id="pet-ascend-message">Loading... just a sec.</span></div>
          </div>
        </div>
        <div class="cb-section">
          <div class="cb-section-content">
            <div class="cb-flex-1">Optimize Equipment</div>
            <div class="cb-flex-1 right">
              <label class="switch">
                <input id="pet-optimize-equipment-checkbox" type="checkbox">
                <span class="slider round"></span>
              </label>
            </div>
          </div>
        </div>
        <div id="cb-pet-optimize-equipment-sub-section" class="cb-sub-section cb-collapsed">
          <div class="cb-section-content">
            <div class="cb-flex-1 small"><span id="pet-optimize-equipment-message">Loading... just a sec.</span></div>
          </div>
        </div>
        <div class="cb-section-header">Guild ( <span id="cb-guild-name"></span> )</div>
        ${
          globalData.canGuildRaid
          ? `
          <div class="cb-section">
            <div class="cb-section-content">
              <div class="cb-flex-1">Auto Raid</div>
              <div class="cb-flex-1 right">
                <label class="switch">
                  <input id="raids-checkbox" type="checkbox">
                  <span class="slider round"></span>
                </label>
              </div>
            </div>
          </div>
          <div id="cb-raids-sub-section" class="cb-sub-section cb-collapsed">
            <div class="cb-section-content">
              <div class="cb-flex-1 small">Next Raid @ <span id="guild-next-time">-</span></div>
              <div class="break"></div>
              <div class="cb-flex-1 small">Last Level: <span id="guild-level">-</span></div>
              <div class="break"></div>
              <div class="cb-flex-1 small">Last Reward: <span id="guild-item">-</span></div>
            </div>
          </div>`
          : `
          <div class="cb-sub-section">
            <div class="cb-section-content">
              <div class="cb-flex-1 small">You need to be a guild Leader or Mod to use this feature.</span></div>
            </div>
          </div>`
        }
        <div id="cb-footer" class="text-border-light"><a href="https://github.com/marnovandermaas/idleLands-automation" target="_blank">Source</a> - Thanks to everyone in the <a href="https://github.com/marnovandermaas/idleLands-automation#credits" target="_blank">Credits</a> - <a href="https://github.com/marnovandermaas/idleLands-automation/blob/main/LICENSE" target="_blank">License</a></div>
      </div>
    </div>
  ` );
}

const start = () => {

  const mainLoop = setInterval( () => {
    updateUI();
  }, 500);

  // Event listeners
  document.getElementById('cb-settings-close').addEventListener( 'click', function(e) {
    let el = document.getElementById('cb-settings-container');
    el.classList.toggle('cb-hide');
  });

  document.getElementById('cb-settings-divine-path-add').addEventListener( 'click', async function(e) {
    let formEl = document.getElementById('cb-sub-section-divine-path-form');
    let selectEl = document.getElementById('cb-sub-section-divine-path-select');
    let nameEl = document.getElementById('divine-path-form-name-text');
    let coordsEl = document.getElementById('divine-path-form-input-text');
    if(!formEl.classList.contains('cb-hide')) {
      if(nameEl.value != '' && coordsEl.value != '') {
        options.ddPaths[nameEl.value] = formatDdList(coordsEl.value);
        populateDivinePathOptions();
      }
    }
    formEl.classList.toggle('cb-hide');
    selectEl.classList.toggle('cb-hide');
  });

  document.getElementById('cb-settings-open').addEventListener( 'click', async function(e) {
    let el = document.getElementById('cb-settings-container');
    let style = getComputedStyle(el);
    el.style.left = (e.pageX - parseInt(style.width)) + 'px';
    el.style.top = e.pageY + 'px';

    el.classList.toggle('cb-hide');

    // populate min guild raid level options
    document.getElementById('cb-min-raid-select').innerHTML = await buildMinRaidOptions();
    // populate max guild raid level options
    document.getElementById('cb-max-raid-select').innerHTML = await buildMaxRaidOptions();
    // populate raid items options
    document.getElementById('cb-raid-item-select').innerHTML = buildRaidItemOptions(0);
    document.getElementById('cb-raid-item-2-select').innerHTML = buildRaidItemOptions(1);
    document.getElementById('cb-raid-item-3-select').innerHTML = buildRaidItemOptions(2);

    populateDivinePathOptions();

    document.getElementById('cb-pet-adventure-collect-text').value = options.petAdventureCollectInterval;
    document.getElementById('cb-pet-adventure-collect-text').previousSibling.previousSibling.innerHTML = timeConversion(options.petAdventureCollectInterval);

    document.getElementById('cb-pet-adventure-embark-text').value = options.petAdventureEmbarkInterval;
    document.getElementById('cb-pet-adventure-embark-text').previousSibling.previousSibling.innerHTML = timeConversion(options.petAdventureEmbarkInterval);

    document.getElementById('cb-pet-gold-collect-text').value = options.petGoldCollectInterval;
    document.getElementById('cb-pet-gold-collect-text').previousSibling.previousSibling.innerHTML = timeConversion(options.petGoldCollectInterval);

    document.getElementById('cb-buy-pot-text').value = options.buyPotInterval;
    document.getElementById('cb-buy-pot-text').previousSibling.previousSibling.innerHTML = timeConversion(options.buyPotInterval);

    document.getElementById('cb-pet-auto-ascend-text').value = options.petAutoAscendInterval;
    document.getElementById('cb-pet-auto-ascend-text').previousSibling.previousSibling.innerHTML = timeConversion(options.petAutoAscendInterval);

    document.getElementById('cb-pet-optimize-equipment-text').value = options.petOptimizeEquipmentInterval;
    document.getElementById('cb-pet-optimize-equipment-text').previousSibling.previousSibling.innerHTML = timeConversion(options.petOptimizeEquipmentInterval);

    document.getElementById('cb-donate-gold-text').value = options.donateGoldInterval;
    document.getElementById('cb-donate-gold-text').previousSibling.previousSibling.innerHTML = timeConversion(options.donateGoldInterval);

    document.getElementById('cb-optimize-equipment-text').value = options.optimizeEquipmentInterval;
    document.getElementById('cb-optimize-equipment-text').previousSibling.previousSibling.innerHTML = timeConversion(options.optimizeEquipmentInterval);

    document.getElementById('cb-choices-interval-text').value = options.optimizeEquipmentInterval;
    document.getElementById('cb-choices-interval-text').previousSibling.previousSibling.innerHTML = timeConversion(options.choicesInterval);

    document.getElementById('cb-guild-raid-text').value = options.guildRaidInterval;
    document.getElementById('cb-guild-raid-text').previousSibling.previousSibling.innerHTML = timeConversion(options.guildRaidInterval);

    document.getElementById('cb-use-scrolls-text').value = options.useScrollsInterval;
    document.getElementById('cb-use-scrolls-text').previousSibling.previousSibling.innerHTML = timeConversion(options.useScrollsInterval);

    document.getElementById('cb-reroll-quests-text').value = options.rerollQuestsInterval;
    document.getElementById('cb-reroll-quests-text').previousSibling.previousSibling.innerHTML = timeConversion(options.rerollQuestsInterval);

    document.getElementById('cb-choice-item-min-score-text').value = options.choiceItemMinScore;
  });

  let typingTimeout = null;
  document.getElementById('cb-reroll-quests-text').addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions(options, 'rerollQuestsInterval', e.target.value);
      triggerChange(options, 'rerollQuests', document.getElementById('reroll-quests-checkbox'), false);
    }, 2000);
  });

  document.getElementById('cb-buy-pot-text').addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions(options, 'buyPotInterval', e.target.value);
      triggerChange(options, 'buyPot', document.getElementById('buy-pots-checkbox'), false);
    }, 2000);
  });

  document.getElementById('cb-use-scrolls-text').addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions(options, 'useScrollsInterval', e.target.value);
      triggerChange(options, 'useScrolls', document.getElementById('use-scrolls-checkbox'), false);
    }, 2000);
  });

  document.getElementById('cb-guild-raid-text').addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions(options, 'guildRaidInterval', e.target.value);
      triggerChange(options, 'raids', document.getElementById('raids-checkbox'), false);
    }, 2000);
  });

  document.getElementById('cb-optimize-equipment-text').addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions(options, 'optimizeEquipmentInterval', e.target.value);
      triggerChange(options, 'optimizeEquipment', document.getElementById('optimize-equipment-checkbox'), false);
    }, 2000);
  });

  document.getElementById('cb-choices-interval-text').addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions(options, 'choicesInterval', e.target.value);
      triggerChange(options, 'choices', document.getElementById('choices-checkbox'), false);
    }, 2000);
  });

  document.getElementById('cb-pet-adventure-collect-text').addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions(options, 'petAdventureCollectInterval', e.target.value);
      triggerChange(options, 'petAdventureCollect', document.getElementById('pet-adventure-collect-checkbox'), false);
    }, 2000);
  });

  document.getElementById('cb-pet-adventure-embark-text').addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions(options, 'petAdventureEmbarkInterval', e.target.value);
      triggerChange(options, 'petAdventureEmbark', document.getElementById('pet-adventure-embark-checkbox'), false);
    }, 2000);
  });

  document.getElementById('cb-pet-gold-collect-text').addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions(options, 'petGoldCollectInterval', e.target.value);
      triggerChange(options, 'petGoldCollect', document.getElementById('pet-gold-checkbox'), false);
    }, 2000);
  });

  document.getElementById('cb-pet-auto-ascend-text').addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions(options, 'petAutoAscendInterval', e.target.value);
      triggerChange(options, 'petAutoAscend', document.getElementById('pet-ascend-checkbox'), false);
    }, 2000);
  });

  document.getElementById('cb-pet-optimize-equipment-text').addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions(options, 'petOptimizeEquipmentInterval', e.target.value);
      triggerChange(options, 'petOptimizeEquipment', document.getElementById('pet-optimize-equipment-checkbox'), false);
    }, 2000);
  });

  document.getElementById('cb-donate-gold-text').addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions(options, 'donateGoldInterval', e.target.value);
      triggerChange(options, 'donateGold', document.getElementById('donate-gold-checkbox'), false);
    }, 2000);
  });

  var petAdventureCollectLoop;
  document.getElementById('pet-adventure-collect-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          petAdventureCollectLoop = setInterval( claimAdventures, options.petAdventureCollectInterval );
          console.log('pet adventures collect started');
          saveOptions(options, 'petAdventureCollect', true);
      } else {
          clearInterval(petAdventureCollectLoop);
          console.log('pet adventures collect stopped');
          saveOptions(options, 'petAdventureCollect', false);
      }
  });
  triggerChange(options, 'petAdventureCollect', document.getElementById('pet-adventure-collect-checkbox'), true);

  var petAdventureEmbarkLoop;
  document.getElementById('pet-adventure-embark-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          petAdventureEmbarkLoop = setInterval( embarkAdventures, options.petAdventureEmbarkInterval );
          console.log('pet adventures embark started');
          saveOptions(options, 'petAdventureEmbark', true);
      } else {
          clearInterval(petAdventureEmbarkLoop);
          console.log('pet adventures embark stopped');
          saveOptions(options, 'petAdventureEmbark', false);
      }
  });
  triggerChange(options, 'petAdventureEmbark', document.getElementById('pet-adventure-embark-checkbox'), true);

  var petGoldCollectLoop;
  document.getElementById('pet-gold-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          petGoldCollectLoop = setInterval( PetGoldCollect, options.petGoldCollectInterval );
          console.log('pet gold collection started');
          saveOptions(options, 'petGoldCollect', true);
      } else {
          clearInterval(petGoldCollectLoop);
          console.log('pet gold collection stopped');
          saveOptions(options, 'petGoldCollect', false);
      }
  });
  triggerChange(options, 'petGoldCollect', document.getElementById('pet-gold-checkbox'), true);

  var petAbilityLoop;
  document.getElementById('pet-ability-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          petAbilityLoop = setInterval( PetAbility, options.petAbilityInterval );
          console.log('pet ability started');
          saveOptions(options, 'petAbility', true);
      } else {
          clearInterval(petAbilityLoop);
          console.log('pet ability stopped');
          saveOptions(options, 'petAbility', false);
      }
  });
  triggerChange(options, 'petAbility', document.getElementById('pet-ability-checkbox'), true);

  var freeRollLoop;
  document.getElementById('free-roll-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          freeRollLoop = setInterval( FreeRoll, 1000*60 );
          console.log('free roll started');
          saveOptions(options, 'freeRoll', true);
      } else {
          clearInterval(freeRollLoop);
          console.log('free roll stopped');
          saveOptions(options, 'freeRoll', false);
      }
  });
  triggerChange(options, 'freeRoll', document.getElementById('free-roll-checkbox'), true);

  var rerollQuestsLoop;
  document.getElementById('reroll-quests-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          rerollQuestsLoop = setInterval( RerollQuests, options.rerollQuestsInterval );
          console.log('reroll quests started');
          saveOptions(options, 'rerollQuests', true);
      } else {
          clearInterval(rerollQuestsLoop);
          console.log('reroll quests stopped');
          saveOptions(options, 'rerollQuests', false);
      }
  });
  triggerChange(options, 'rerollQuests', document.getElementById('reroll-quests-checkbox'), true);

  var buyPotLoop;
  document.getElementById('buy-pots-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          buyPotLoop = setInterval( BuyPot, options.buyPotInterval );
          console.log('buying potions started');
          saveOptions(options, 'buyPot', true);
      } else {
          clearInterval(buyPotLoop);
          console.log('buying potions stopped');
          saveOptions(options, 'buyPot', false);
      }
  });
  triggerChange(options, 'buyPot', document.getElementById('buy-pots-checkbox'), true);

  var useScrollsLoop;
  document.getElementById('use-scrolls-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          useScrollsLoop = setInterval( UseScrolls, options.useScrollsInterval );
          console.log('use scrolls started');
          saveOptions(options, 'useScrolls', true);
      } else {
          clearInterval(useScrollsLoop);
          console.log('use scrolls stopped');
          saveOptions(options, 'useScrolls', false);
      }
  });
  triggerChange(options, 'useScrolls', document.getElementById('use-scrolls-checkbox'), true);

  var donateGoldLoop;
  document.getElementById('donate-gold-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          donateGoldLoop = setInterval( DonateGold, options.donateGoldInterval );
          console.log('donate gold started');
          saveOptions(options, 'donateGold', true);
      } else {
          clearInterval(donateGoldLoop);
          console.log('donate gold stopped');
          saveOptions(options, 'donateGold', false);
      }
  });
  triggerChange(options, 'donateGold', document.getElementById('donate-gold-checkbox'), true);

  var optimizeEquipmentLoop;
  document.getElementById('optimize-equipment-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          optimizeEquipmentLoop = setInterval( OptimizeEquipment, options.optimizeEquipmentInterval );
          console.log('optimize equipment started');
          saveOptions(options, 'optimizeEquipment', true);
          document.getElementById('cb-optimize-equipment-sub-section').classList.toggle('cb-collapsed');
      } else {
          clearInterval(optimizeEquipmentLoop);
          console.log('optimize equipment stopped');
          saveOptions(options, 'optimizeEquipment', false);
          document.getElementById('cb-optimize-equipment-sub-section').classList.toggle('cb-collapsed');
      }
  });
  triggerChange(options, 'optimizeEquipment', document.getElementById('optimize-equipment-checkbox'), true);

  var choicesLoop;
  document.getElementById('choices-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          choicesLoop = setInterval( RunChoices, options.choicesInterval );
          console.log('choices started');
          saveOptions(options, 'choices', true);
      } else {
          clearInterval(choicesLoop);
          console.log('choices stopped');
          saveOptions(options, 'choices', false);
      }
  });
  triggerChange(options, 'choices', document.getElementById('choices-checkbox'), true);

  var inventoryLoop;
  document.getElementById('inventory-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          inventoryLoop = setInterval( RunInventory, options.inventoryInterval );
          console.log('inventory cleanup started');
          saveOptions(options, 'inventory', true);
      } else {
          clearInterval(inventoryLoop);
          console.log('inventory cleanup stopped');
          saveOptions(options, 'inventory', false);
      }
  });
  triggerChange(options, 'inventory', document.getElementById('inventory-checkbox'), true);

  var petAutoAscendLoop;
  document.getElementById('pet-ascend-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          petAutoAscendLoop = setInterval( petAscend, options.petAutoAscendInterval );
          console.log('pet auto ascend started');
          saveOptions(options, 'petAutoAscend', true);
          document.getElementById('cb-pet-ascend-sub-section').classList.toggle('cb-collapsed');
      } else {
          clearInterval(petAutoAscendLoop);
          console.log('pet auto ascend stopped');
          saveOptions(options, 'petAutoAscend', false);
          document.getElementById('cb-pet-ascend-sub-section').classList.toggle('cb-collapsed');
      }
  });
  triggerChange(options, 'petAutoAscend', document.getElementById('pet-ascend-checkbox'), true);

  var petOptimizeEquipmentLoop;
  document.getElementById('pet-optimize-equipment-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          petOptimizeEquipmentLoop = setInterval( petOptimizeEquipment, options.petOptimizeEquipmentInterval );
          console.log('pet optimize equipment started');
          saveOptions(options, 'petOptimizeEquipment', true);
          document.getElementById('cb-pet-optimize-equipment-sub-section').classList.toggle('cb-collapsed');
      } else {
          clearInterval(petOptimizeEquipmentLoop);
          console.log('pet optimize equipment stopped');
          saveOptions(options, 'petOptimizeEquipment', false);
          document.getElementById('cb-pet-optimize-equipment-sub-section').classList.toggle('cb-collapsed');
      }
  });
  triggerChange(options, 'petOptimizeEquipment', document.getElementById('pet-optimize-equipment-checkbox'), true);

  var divineDirectionLoop;
  document.getElementById('divine-path-form-enabled-checkbox').addEventListener( 'change', function() {
      if(this.checked) {
          divineDirectionLoop = setInterval( RunDivineDirection, options.divineDirectionInterval );
          console.log('divine direction started');
          saveOptions(options, 'ddEnable', true);
          globalData.divineDirectionIndex = 0;
      } else {
          clearInterval(divineDirectionLoop);
          console.log('divine directions stopped');
          saveOptions(options, 'ddEnable', false);
          globalData.divineDirectionIndex = 0;
      }
  });
  triggerChange(options, 'ddEnable', document.getElementById('divine-path-form-enabled-checkbox'), true);

  document.getElementById('divine-path-form-loop-checkbox').addEventListener( 'change', function() {
    saveOptions(options, 'ddLoop', this.checked);
  });
  triggerChange(options, 'ddLoop', document.getElementById('divine-path-form-loop-checkbox'), true);

  document.getElementById('divine-path-form-cooldown-checkbox').addEventListener( 'change', function() {
    saveOptions(options, 'ddCheckCooldown', this.checked);
  });
  triggerChange(options, 'ddCheckCooldown', document.getElementById('divine-path-form-cooldown-checkbox'), true);

  document.getElementById('cb-choice-trainer-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'choiceTrainerOption', e.target.value);
  });
  document.getElementById('cb-choice-portal-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'choicePortalOption', e.target.value);
  });
  document.getElementById('cb-choice-gambling-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'choiceGamblingOption', e.target.value);
  });
  document.getElementById('cb-choice-party-leave-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'choicePartyLeaveOption', e.target.value);
  });
  document.getElementById('cb-choice-buy-item-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'choiceBuyItemOption', e.target.value);
  });
  document.getElementById('cb-choice-item-found-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'choiceItemFoundOption', e.target.value);
  });
  document.getElementById('cb-choice-item-min-score-text').addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(function () {
      saveOptions(options, 'choiceItemMinScore', e.target.value);
      triggerChange(options, 'choices', document.getElementById('choices-checkbox'), false);
    }, 2000);
  });
  document.getElementById('cb-choice-enchant-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'choiceEnchantOption', e.target.value);
  });
  document.getElementById('cb-quest-treasure-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'questTreasureScalar', e.target.value);
    triggerChange(options, 'rerollQuests', document.getElementById('reroll-quests-checkbox'), false);
  });
  document.getElementById('cb-quest-collectible-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'questCollectibleScalar', e.target.value);
    triggerChange(options, 'rerollQuests', document.getElementById('reroll-quests-checkbox'), false);
  });
  document.getElementById('cb-quest-sell-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'questSellScalar', e.target.value);
    triggerChange(options, 'rerollQuests', document.getElementById('reroll-quests-checkbox'), false);
  });
  document.getElementById('cb-quest-salvage-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'questSalvageScalar', e.target.value);
    triggerChange(options, 'rerollQuests', document.getElementById('reroll-quests-checkbox'), false);
  });
  document.getElementById('cb-quest-combat-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'questCombatScalar', e.target.value);
    triggerChange(options, 'rerollQuests', document.getElementById('reroll-quests-checkbox'), false);
  });
  document.getElementById('cb-quest-stamina-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'questStaminaScalar', e.target.value);
    triggerChange(options, 'rerollQuests', document.getElementById('reroll-quests-checkbox'), false);
  });
  document.getElementById('cb-quest-gain-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'questGainScalar', e.target.value);
    triggerChange(options, 'rerollQuests', document.getElementById('reroll-quests-checkbox'), false);
  });
  document.getElementById('cb-quest-spend-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'questSpendScalar', e.target.value);
    triggerChange(options, 'rerollQuests', document.getElementById('reroll-quests-checkbox'), false);
  });
  document.getElementById('cb-quest-step-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'questStepScalar', e.target.value);
    triggerChange(options, 'rerollQuests', document.getElementById('reroll-quests-checkbox'), false);
  });
  document.getElementById('cb-inventory-cleanup-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'inventoryCleanup', e.target.value);
  });
  document.getElementById('cb-gold-donate-ratio-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'goldDonateRatio', e.target.value);
    triggerChange(options, 'donateGold', document.getElementById('donate-gold-checkbox'), false);
  });
  document.getElementById('cb-pet-optimize-equipment-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'petOptimizeEquipmentStat', e.target.value);
  });
  document.getElementById('cb-pets-per-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'petAdventurePetNum', e.target.value);
  });
  document.getElementById('cb-optimize-equipment-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'optimizeEquipmentStat', e.target.value);
  });
  document.getElementById('cb-min-raid-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'guildRaidMinLevel', e.target.value);
  });
  document.getElementById('cb-max-raid-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'guildRaidMaxLevel', e.target.value);
  });
  document.getElementById('cb-raid-item-select').addEventListener( 'change', function(e) {
    options.guildRaidItems[0] = e.target.value;
    saveOptions(options, 'guildRaidItems', options.guildRaidItems);
  });
  document.getElementById('cb-raid-item-2-select').addEventListener( 'change', function(e) {
    options.guildRaidItems[1] = e.target.value;
    saveOptions(options, 'guildRaidItems', options.guildRaidItems);
  });
  document.getElementById('cb-raid-item-3-select').addEventListener( 'change', function(e) {
    options.guildRaidItems[2] = e.target.value;
    saveOptions(options, 'guildRaidItems', options.guildRaidItems);
  });
  document.getElementById('cb-divine-path-select').addEventListener( 'change', function(e) {
    saveOptions(options, 'ddSelectedPathName', e.target.value);
    document.getElementById('cb-divine-path-selected-path-name').innerHTML = e.target.value;
  });
  document.getElementById('cb-divine-path-delete-select').addEventListener( 'change', function(e) {
    if(e.target.value != options.ddSelectedPathName) {
      delete options.ddPaths[e.target.value];
      populateDivinePathOptions();
    }
  });

  if(globalData.canGuildRaid) {
    const guildTimeEl = document.getElementById('guild-next-time');
    const guildLevelEl = document.getElementById('guild-level');
    const guildItemEl = document.getElementById('guild-item');

    var raidsLoop;
    document.getElementById('raids-checkbox').addEventListener( 'change', async function() {
          if(this.checked) {
              raidsLoop = setInterval( RunRaids, options.guildRaidInterval );
              console.log('raiding started');

              let guildResponse = await fetch('https://server.idle.land/api/guilds/name?name=' + discordGlobalCharacter.guildName);
              let guildData = await guildResponse.json();

              options.guildRaidNextAvailability = guildData.guild.nextRaidAvailability;
              var date = new Date(options.guildRaidNextAvailability);
              guildTimeEl.innerHTML = date.toLocaleTimeString();
              document.getElementById('cb-raids-sub-section').classList.toggle('cb-collapsed');
              saveOptions(options, 'raids', true);
          } else {
              clearInterval(raidsLoop);
              console.log('raiding stopped');
              guildTimeEl.innerHTML = '-';
              guildLevelEl.innerHTML = '-';
              guildItemEl.innerHTML = '-';
              globalData.raidFail = false;
              globalData.raidFailTimes = 0;
              document.getElementById('cb-raids-sub-section').classList.toggle('cb-collapsed');
              saveOptions(options, 'raids', false);
          }
    });
    triggerChange(options, 'raids', document.getElementById('raids-checkbox'), true);
  }

  // Make the whole container draggable
  dragElement(document.getElementById('cb-settings-container'));
  dragElement(document.getElementById('cb-container'));
  accordionElement(document.getElementById('cb-container'));
  tabsNav('cb-settings-panel');
  //tabsNav('cb-main-panel');
}

const petOptimizeEquipment = () => {

  let currentInventory = discordGlobalCharacter.$inventoryData.items;

  currentInventory.forEach(item => {
    let petEquipment = discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet].equipment;

    if(petEquipment[item.type]) {

      let didEquip = false;
      petEquipment[item.type].forEach((cItem, idx) => {

        if(didEquip) return;

        if(!cItem) {
          didEquip = true;
          setTimeout( () => {unsafeWindow.__emitSocket('pet:equip', { itemId: item.id }) }, 500);
          return;
        }

        if(options.petOptimizeEquipmentStat == 'score') {
          if(item.score > cItem.score) {
            didEquip = true;
            setTimeout( () => {unsafeWindow.__emitSocket('pet:equip', { itemId: item.id, unequipId: cItem.id, unequipSlot: cItem.type }) }, 500);
            return;
          }
        } else {
          let newItemStat = item.stats[options.petOptimizeEquipmentStat] || 0;
          let oldItemStat = cItem.stats[options.petOptimizeEquipmentStat] || 0;

          if(newItemStat > oldItemStat) {
            didEquip = true;
            setTimeout( () => {unsafeWindow.__emitSocket('pet:equip', { itemId: item.id, unequipId: cItem.id, unequipSlot: cItem.type }) }, 500);
            return;
          }
        }
      });
    }
  });
}

// Pet ascend
const petAscend = () => {

  let pet = discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet];

  if(pet.level.maximum != pet.level.__current) {
      document.getElementById('pet-ascend-message').innerHTML = 'Ah, the waiting game for max level to be reached!';
      return false;
  }
  if(pet.rating >= 5) {
      document.getElementById('pet-ascend-message').innerHTML = `This pet has reached a rating of 5, don't forget to max out the levels.`;
      document.getElementById('cb-pet-ascend-sub-section').classList.toggle('cb-collapsed');
      return false;
  }
  if(pet.rating >= 5 && pet.level.maximum == pet.level.__current) {
      document.getElementById('pet-ascend-message').innerHTML = `This pet has reached it's maximum level capacity, this is a good thing! Try maxing out other pets.`;
      document.getElementById('cb-pet-ascend-sub-section').classList.toggle('cb-collapsed');
      return false;
  }
  let someMaterialsMissing = Object.keys(pet.$ascMaterials).some((mat) => pet.$ascMaterials[mat] > (discordGlobalCharacter.$petsData.ascensionMaterials[mat] || 0))
  if(someMaterialsMissing) {
      document.getElementById('pet-ascend-message').innerHTML = 'Oops, you are missing materials';
      document.getElementById('cb-pet-ascend-sub-section').classList.toggle('cb-collapsed');
      return false;
  }

  // get gold before ascend
  setTimeout( () => { unsafeWindow.__emitSocket('pet:takegold') }, 200)
  // then ascend
  setTimeout( () => { unsafeWindow.__emitSocket('pet:ascend') }, 500);
}

// Pet adventures
const claimAdventures = () => {

    // get expired adventures and claim
    let adventuresFinished = Object.values(discordGlobalCharacter.$petsData.adventures).filter(x => (x.finishAt <= Date.now()) && x.finishAt != 0);

    if (adventuresFinished.length) {
      for (let i = 0; i < adventuresFinished.length; i++) {
        let currentAdventure = adventuresFinished[i];

        setTimeout( () => {
          unsafeWindow.__emitSocket('pet:adventure:finish', { adventureId: currentAdventure.id }); // Collect
        }, 1000 * i);
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
            unsafeWindow.__emitSocket('pet:adventure:embark', { adventureId: currentAdventure.id, petIds: petsTemp });
          }
        }, 1000 * i);
      }
    }
}
const RunRaids = async () => {
  if(options.guildRaidNextAvailability <= Date.now()) {

      let level = 0;
      let reward = [];
      let results = null;

      let response = await fetch('https://server.idle.land/api/guilds/raids?maxLevel=' + options.guildRaidMaxLevel);
      let data = await response.json();

      results = data.raids.filter(element => {
        return element.rewards.some(r => options.guildRaidItems.includes(r)) && (element.level >= options.guildRaidMinLevel && element.level <= options.guildRaidMaxLevel);
      });

      if (results.length > 0) {
        level = results[results.length-1].level;
        results[results.length-1].rewards.forEach(element => {
          reward.push(raidRewards[element]);
        });
      } else {
        level = options.guildRaidMaxLevel;
        data.raids[data.raids.length-1].rewards.forEach(element => {
          reward.push(raidRewards[element]);
        });
      }

      setTimeout( () => {unsafeWindow.__emitSocket('guild:raidboss', { bossLevel: level})}, 500);

      setTimeout(async () => {
          let guild = await getGuildData();

          // this is the only way that I know to check if the raid failed
          if(Date.now() > guild.nextRaidAvailability) {
            globalData.raidFail = true;
            globalData.raidFailTimes++;
            // we will add 10 mins to the next raid availability, don't want to spam the server and waste too much gold.
            options.guildRaidNextAvailability = Date.now() + 10*60000;
            level = 'Failed';
            reward.length = 0;
            reward.push('Failed');
          } else {
            options.guildRaidNextAvailability = guild.nextRaidAvailability;
            globalData.raidFail = false;
            globalData.raidFailTimes = 0;
          }
          let date = new Date(options.guildRaidNextAvailability);

          document.getElementById('guild-next-time').innerHTML = date.toLocaleTimeString();
          document.getElementById('guild-level').innerHTML = level;
          document.getElementById('guild-item').innerHTML = reward.join();
      }, 7000); // added 5 seconds extra
  }
}
const RunChoices = () => {
  let choices = Object.values(discordGlobalCharacter.$choicesData.choices);
  let delay = 200;
  choices.forEach(choice => {
    let choiceVal = 'none';
    if(choice.event == 'Merchant') {
      if(choice.extraData.cost <= discordGlobalCharacter.gold) {
        if(choice.extraData.item.type == 'enchant') {
          choiceVal = options.choiceEnchantOption;
        } else {
          if (options.choiceBuyItemOption == 'none') {
            choiceVal = 'none';
          } else {
            if (choice.extraData.item.score >= options.choiceItemMinScore) choiceVal = options.choiceBuyItemOption;
            else choiceVal = 'No';
          }
        }
      }
    }
    if(choice.event == 'Gamble') {
      if(options.choiceGamblingOption == 'No') {
        choiceVal = options.choiceGamblingOption;
      } else {
        if(choice.extraData.bet <= discordGlobalCharacter.gold) {
          choiceVal = options.choiceGamblingOption;
        }
      }
    }
    if(choice.event == 'FindItem') {
      if (options.choiceItemFoundOption == 'none') {
        choiceVal = 'none';
      } else {
        if (choice.extraData.item.score >= options.choiceItemMinScore) choiceVal = options.choiceItemFoundOption;
        else choiceVal = 'Sell';
      }
    }
    if(choice.event == 'PartyLeave') {
      choiceVal = options.choicePartyLeaveOption;
    }
    if(choice.event == 'Portal') {
      choiceVal = options.choicePortalOption;
    }
    if(choice.event == 'FindTrainer') {
      choiceVal = options.choiceTrainerOption;
    }

    if(choiceVal != 'none') {
      setTimeout( () => {
        unsafeWindow.__emitSocket('choice:make', { choiceId: choice.id, valueChosen: choiceVal });
      }, delay);
      delay += 1000;
    }
  });

}

const RunDivineDirection = () => {
  if(options.ddSelectedPathName == 'none') return;

  let path = options.ddPaths[options.ddSelectedPathName];
  if(path.length <= 0) return;

  if (!!discordGlobalCharacter.divineDirection &&
      ((discordGlobalCharacter.divineDirection.x == discordGlobalCharacter.x && discordGlobalCharacter.divineDirection.y == discordGlobalCharacter.y) ||
       (discordGlobalCharacter.divineDirection.x == 1 && discordGlobalCharacter.divineDirection.y == 1) ||
       discordGlobalCharacter.divineDirection.steps < 10 ||
       !discordGlobalCharacter.divineDirection.x || 
       !discordGlobalCharacter.divineDirection.y
      )
  ) {
    //Disable current divine direction
    setTimeout( () => {unsafeWindow.__emitSocket('character:divinedirection', {x: 1, y: 1}) }, 500);
    if(options.ddLoop) {
      globalData.divineDirectionIndex += 1;
    }
  }

  if (!discordGlobalCharacter.divineDirection) {
    if(options.ddCheckCooldown) {
      //Find next coordinate in path that is not in cooldown
      let sentCoord = false;
      for (let i = 0; i < path.length; i++) {
        let cooldownNames = Object.keys(discordGlobalCharacter.cooldowns);
        let cooldownExists = false;
        for (let j = 0; j < cooldownNames.length; j++) {
          if (cooldownNames[j].startsWith(`${path[i].x},${path[i].y}|`)) {
            cooldownExists = discordGlobalCharacter.cooldowns[cooldownNames[j]] > Date.now();
            break;
          }
        }
        if (!cooldownExists) {
          setTimeout( () => {unsafeWindow.__emitSocket('character:divinedirection', path[i]) }, 500);
          sentCoord = true;
          break;
        }
      }
      //If we have not sent out a coordinate wait at the beginning of path
      if(!sentCoord) {
        setTimeout( () => {unsafeWindow.__emitSocket('character:divinedirection', path[0]) }, 500);
      }
    } else if(options.ddLoop) {
      if(globalData.divineDirectionIndex >= path.length) {
        globalData.divineDirectionIndex = 0;
      }
      setTimeout( () => {unsafeWindow.__emitSocket('character:divinedirection', path[globalData.divineDirectionIndex]) }, 500);
    }
  }
}

const RunInventory = () => {
  if(discordGlobalCharacter.$inventoryData.items.length == discordGlobalCharacter.$inventoryData.size) {
    if(options.inventoryCleanup == 'salvage') {
      setTimeout( () => { unsafeWindow.__emitSocket('item:salvageall', {}) }, 200);
      console.log('salvaged items');
    }
    if(options.inventoryCleanup == 'sell') {
      setTimeout( () => { unsafeWindow.__emitSocket('item:sellall', {}) }, 200);
      console.log('sold items');
    }
  }
}

const UseScrolls = () => {
  let delay = 200;
  let scrolls = discordGlobalCharacter.$inventoryData.buffScrolls;
  scrolls.forEach(element => {
    setTimeout( () => {
      unsafeWindow.__emitSocket('item:buffscroll', { scrollId: element.id });
    }, delay);
    delay += 1000;
  })
}

const OptimizeEquipment = () => {

  let delay = 200;
  let currentEquipment = discordGlobalCharacter.$inventoryData.equipment;
  let currentInventory = discordGlobalCharacter.$inventoryData.items;

  currentInventory.forEach(element => {
    let slot = element.type;
    let newItemStat = element.stats[options.optimizeEquipmentStat] || 0;
    let oldItemStat = currentEquipment[slot]?.stats[options.optimizeEquipmentStat] || 0;

    if(newItemStat > oldItemStat) {
      console.log(`Character Equiped ${slot}, NEW ${newItemStat} - OLD ${oldItemStat}`);
      setTimeout( () => {
        unsafeWindow.__emitSocket('item:equip', { itemId: element.id });
      }, delay);
      delay += 1000;
    }
  })
}

const FreeRoll = () => {
  if(discordGlobalCharacter.$premiumData.gachaFreeRolls['Astral Gate'] <= Date.now()) {
    let gachaName = 'AstralGate';
    let numRolls = 10;
    setTimeout( () => {unsafeWindow.__emitSocket('astralgate:roll', { astralGateName: gachaName, numRolls }) }, 500);
  }
}
const RerollQuests = () => {
  let quests = discordGlobalCharacter.$questsData.quests;
  for (let i = 0; i < quests.length; i++) {
    let currentQuest = quests[i];
    let delay = 3;
    let complete = true;
    for (let j = 0; j < currentQuest.objectives.length; j++) {
      if (currentQuest.objectives[j].progress < currentQuest.objectives[j].statisticValue) {
        complete = false;
      }
    }
    if (complete) {
      setTimeout( () => {unsafeWindow.__emitSocket('quest:collect', {questId: currentQuest.id})}, 1);
    }
    if (currentQuest.objectives.find( element =>
         ( element.statistic.indexOf('Combat') >= 0 && element.scalar >= options.questCombatScalar )
      || ( element.statistic.indexOf('Stamina') >= 0 && element.scalar >= options.questStaminaScalar )
      || ( element.statistic.indexOf('Step') >= 0 && element.scalar >= options.questStepScalar )
      || ( element.statistic.indexOf('Sell') >= 0 && element.scalar >= options.questSellScalar )
      || ( element.statistic.indexOf('Treasure') >= 0 && element.scalar >= options.questTreasureScalar )
      || ( !!element.requireMap )
      || ( element.statistic.indexOf('Salvage') >= 0 && element.scalar >= options.questSalvageScalar )
      || ( element.statistic.indexOf('Gold/Gain') >= 0 && element.scalar >= options.questGainScalar )
      || ( element.statistic.indexOf('Gold/Spend') >= 0 && element.scalar >= options.questSpendScalar )
      || ( element.statistic.indexOf('Collectible') >= 0 && element.scalar >= options.questCollectibleScalar )
    )) {
          setTimeout(function(){unsafeWindow.__emitSocket('quest:reroll', { questId: currentQuest.id})}, delay * (i+1));
    }
  }
}
const PetGoldCollect = () => {
  setTimeout( () => {unsafeWindow.__emitSocket('pet:takegold')}, 500);
}
const BuyPot = () => {
  setTimeout( () => {unsafeWindow.__emitSocket('premium:goldcollectible', {collectible: 'Pot of Gold'})}, 100);
}
const DonateGold = () => {
  setTimeout( () => {unsafeWindow.__emitSocket('guild:donateresource', { resource: 'gold', amount: parseInt(options.goldDonateRatio*discordGlobalCharacter.gold) })}, 500);
}
const PetAbility = () => {
  let pet = discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet];

  if(discordGlobalCharacter.stamina.__current < pet.$attribute.oocAbilityCost) return;
  setTimeout( () => {unsafeWindow.__emitSocket('pet:oocaction')}, 500);
}

const getGuildData = async () => {
  let response = await fetch('https://server.idle.land/api/guilds/name?name=' + discordGlobalCharacter.guildName);
  let data = await response.json();
  return data.guild;
}

const updateUI = () => {
    document.getElementById('pet-optimize-equipment-message').innerHTML = `Optimized for ${options.petOptimizeEquipmentStat}${options.petOptimizeEquipmentStat == 'score' ? `` : ` - Boost: ${formatNumber(discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet].stats[options.petOptimizeEquipmentStat])}`}`;
    document.getElementById('optimize-equipment-message').innerHTML = 'Optimized for ' + options.optimizeEquipmentStat + ' - Boost: ' + formatNumber(discordGlobalCharacter.stats[options.optimizeEquipmentStat]);
    document.getElementById('cb-player-name').innerHTML = discordGlobalCharacter.name;
    document.getElementById('cb-player-title').innerHTML = discordGlobalCharacter.title;
    document.getElementById('cb-guild-name').innerHTML = discordGlobalCharacter.guildName ? discordGlobalCharacter.guildName : 'Not part of a guild';
    document.getElementById('cb-pet-type').innerHTML = discordGlobalCharacter.$petsData.currentPet;
    document.getElementById('cb-pet-levels').innerHTML = discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet].level.__current + '/' + discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet].level.maximum;
}
