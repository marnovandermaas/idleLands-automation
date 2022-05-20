[![Version](https://img.shields.io/github/v/release/marnovandermaas/idleLands-automation)](https://github.com/marnovandermaas/idleLands-automation/)
[![Open Issues](https://img.shields.io/github/issues/marnovandermaas/idleLands-automation?style=flat)](https://github.com/marnovandermaas/idleLands-automation/issues)
[![Watch This Repo](https://img.shields.io/github/watchers/marnovandermaas/idleLands-automation?style=social&icon=github)](https://github.com/marnovandermaas/idleLands-automation/subscription)
[![Star This Repo](https://img.shields.io/github/stars/marnovandermaas/idleLands-automation?style=social&icon=github)](https://github.com/marnovandermaas/idleLands-automation/stargazers)
[![Fork This Repo](https://img.shields.io/github/forks/marnovandermaas/idleLands-automation?style=social&icon=github)](https://github.com/marnovandermaas/idleLands-automation/fork)

# IdleLands Automation
Automation userscript for IdleLands
https://play.idle.land/

A big thank you to `Sarimash` for sharing some example code he created and to `Torsin` who made the initial version of this automation tool. 

[![screenshot](https://i.postimg.cc/8zSK7DWn/tempsnip.png)](https://postimg.cc/D8xdN9xq)

## Installation
`please note, if you are running v1.3 or lower, you will need to delete and re-install`

1. Install [Violentmonkey](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/) (Firefox) / [Violentmonkey](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) (Chrome).
2. Open `https://raw.githubusercontent.com/marnovandermaas/idleLands-automation/main/thescript.js` or click [here](https://raw.githubusercontent.com/marnovandermaas/idleLands-automation/main/thescript.js).
3. Click on the plus in the Violentmonkey menu, copy the raw script into it and click save.
4. Now refresh IdleLands to start running the script.

## Usage
Once logged into IdleLands, you will see a window on the top right corner.
- You can drag the window anywhere on the screen by clicking and holding the title bar
- You can minimize the window by clicking the `-` icon on the to right corner of the window
- You can change options via the `cog` icon beside you character name
- Also, all options are saved in storage for persistence

## Features
- Free roll (daily)
- Use scrolls/buffs
- Donate gold
- Optimize equipment by gold or XP
- Make choices
- Cleanup inventory
- Divine stumbler
- Quests
  - Reroll quests
  - Buy pots of gold
- Pet adventures
  - Collect adventures when completed
  - Send your pets on adventures
- Active pet
  - Use ability
  - Collect gold (request from Anten)
  - Ascend (request from Anten) (checks for materials and if pet is maxed out)
  - Optimize equipment
- Raids
  - Raiding (must be a guild leader or mod to use this feature)
- Options window
  - Control each type of choice
  - Control each type of quest reroll
  - Control refresh intervals
  - Guild raid options
  - Divine stumbler routes

## Todo
- After 3 guild raid failed attempts, run level 100 raid boss, if that fails, turn off auto raiding
- Enforce personalities, especially when you fate lake and then get randomly set
- (started) Clean the code, seperate in different JS files
- Auto collect global quests
- Create a stats page that shows current xp and gold
- Quest reroll distinguish between types of steps
- Quest reroll should check whether map is current map
- Add special score to auto equip: gold + 10*xp + luck/10
- If you have an idea/suggestion, please ask away

## Problems?
Found a bug or want a new feature? [Open an issue](https://github.com/marnovandermaas/idleLands-automation/issues).

## Contributing
If you wish to contribute open a [pull requests](https://github.com/marnovandermaas/idleLands-automation/pulls).

## Credits
- `Anten`
- `Sarimash`
- `Torsin`
- `Marno`
