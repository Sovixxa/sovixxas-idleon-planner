(function(root){
'use strict';
const data={
  "checked": "2026-09-23",
  "source": "Installed IdleOn game client",
  "sha256": "49a106e5ea60bd6eb3ec36173b7f43720a2805329d1fe08a4fada822c617165c",
  "caps": [
    {
      "world": "World 1",
      "system": "Smithing",
      "name": "Anvilnomics",
      "limit": "90% cost reduction",
      "note": "Anvil point purchases still cost at least 10% of their undiscounted cost. This applies to both coin and material purchases.",
      "evidence": {
        "offset": 4927984,
        "expression": "Math.max(.1,1-c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.AnvilProdCost)/100)"
      },
      "id": "cap-001"
    },
    {
      "world": "World 1",
      "system": "Statues",
      "name": "Startue EXP",
      "limit": "50% EXP retained",
      "note": "The statue level-up routine subtracts at least 50% of the EXP requirement. A larger displayed bubble bonus does not increase this refund in this client.",
      "evidence": {
        "offset": 6738619,
        "expression": "Math.max(.5,1-c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.StatueStartEXP)/100)"
      },
      "id": "cap-002"
    },
    {
      "world": "World 1",
      "system": "Stamps",
      "name": "Material-cost vial",
      "limit": "90% reduction",
      "note": "The MatCostStamp vial multiplier bottoms out at 10% of material cost. Other independent discounts can still apply.",
      "evidence": {
        "offset": 4385675,
        "expression": "Math.max(.1,1-c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchVials.h.MatCostStamp)/100)"
      },
      "id": "cap-003"
    },
    {
      "world": "World 1",
      "system": "Stamps",
      "name": "Hydrogen stamp discount",
      "limit": "90% reduction",
      "note": "Hydrogen’s accumulated stamp discount stops at 90%. Other independent stamp discounts still multiply with it.",
      "evidence": {
        "offset": 10653581,
        "expression": "Math.min(90,c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AtomBonDN)*c.asNumber(a.engine.getGameAttribute(\"OptionsListAccount\")[134]))"
      },
      "id": "cap-004"
    },
    {
      "world": "World 1",
      "system": "Dungeons",
      "name": "Block chance",
      "limit": "95%",
      "note": "The combined dungeon block chance is limited to 95%.",
      "evidence": {
        "offset": 7748647,
        "expression": "Math.min(95,w._customBlock_EtcBonuses(\"39\")+w._customBlock_CardBonusREAL(62)+c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.DungeonStats.h.BlockChance)+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.DungeonStats.h.hpMpBloU)+(Math.min(.3*c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.blockStackVAL),c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.DungeonStats.h.blockStack))+Math.min(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.DungeonStats.h.defGodU),30))))"
      },
      "id": "cap-005"
    },
    {
      "world": "World 1",
      "system": "Dungeons",
      "name": "Drop rarity contribution",
      "limit": "3×",
      "note": "Dungeon kill rewards clamp the character drop-rarity factor to 3×. This does not cap normal-world drop rate.",
      "evidence": {
        "offset": 4564453,
        "expression": "Math.min(3,x._customBlock_TotalStats(\"Drop_Rarity\"))"
      },
      "id": "cap-006"
    },
    {
      "world": "World 1",
      "system": "Dungeons",
      "name": "Card chance contribution",
      "limit": "2×",
      "note": "The dungeon card-chance stat contributes at most 2×; the separate server multiplier is applied afterward.",
      "evidence": {
        "offset": 4568450,
        "expression": "Math.min(2,p._customBlock_DungeonStat(\"CardChance\"))"
      },
      "id": "cap-007"
    },
    {
      "world": "World 2",
      "system": "Alchemy",
      "name": "Orange Bargain",
      "limit": "95% reduction",
      "note": "The orange-only bubble discount leaves at least 5% of the cost. Other discount sources are separate multipliers.",
      "evidence": {
        "offset": 5066913,
        "expression": "Math.max(.05,1-c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.BubbleCostOr)/100)"
      },
      "id": "cap-008"
    },
    {
      "world": "World 2",
      "system": "Alchemy",
      "name": "Green Bargain",
      "limit": "95% reduction",
      "note": "The green-only bubble discount leaves at least 5% of the cost. Other discount sources are separate multipliers.",
      "evidence": {
        "offset": 5067114,
        "expression": "Math.max(.05,1-c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.BubbleCostGr)/100)"
      },
      "id": "cap-009"
    },
    {
      "world": "World 2",
      "system": "Alchemy",
      "name": "Purple Bargain",
      "limit": "95% reduction",
      "note": "The purple-only bubble discount leaves at least 5% of the cost. Other discount sources are separate multipliers.",
      "evidence": {
        "offset": 5067315,
        "expression": "Math.max(.05,1-c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.BubbleCostPu)/100)"
      },
      "id": "cap-010"
    },
    {
      "world": "World 2",
      "system": "Alchemy",
      "name": "Yellow Bargain",
      "limit": "95% reduction",
      "note": "The yellow-only bubble discount leaves at least 5% of the cost. Other discount sources are separate multipliers.",
      "evidence": {
        "offset": 5067511,
        "expression": "Math.max(.05,1-c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.BubbleCostYe)/100)"
      },
      "id": "cap-011"
    },
    {
      "world": "World 2",
      "system": "Alchemy",
      "name": "Undeveloped Costs + vial",
      "limit": "95% combined reduction",
      "note": "The all-bubble discount and AlchBubbleCost vial share one 95% limit. This is separate from each colour’s Bargain bubble.",
      "evidence": {
        "offset": 5067803,
        "expression": "Math.max(.05,1-(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchVials.h.AlchBubbleCost)+c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.BubbleCost))/100)"
      },
      "id": "cap-012"
    },
    {
      "world": "World 2",
      "system": "Alchemy",
      "name": "Cauldron cost boost",
      "limit": "90% reduction",
      "note": "The cauldron’s own cost-reduction multiplier cannot reduce the remaining price below 10%.",
      "evidence": {
        "offset": 5067725,
        "expression": "Math.max(.1,1-q._customBlock_CauldronStats(\"CauldronLvsBrewBonus\",t,2,0)/100)"
      },
      "id": "cap-013"
    },
    {
      "world": "World 2",
      "system": "Alchemy",
      "name": "Bargain Tag purchases",
      "limit": "90% reduction",
      "note": "The 0.75-per-purchase multiplier stops at 0.1. The ninth purchase reaches the cap; further purchases cannot improve this factor.",
      "evidence": {
        "offset": 5067973,
        "expression": "Math.max(.1,Math.pow(.75,c.asNumber(a.engine.getGameAttribute(\"OptionsListAccount\")[62])))"
      },
      "id": "cap-014"
    },
    {
      "world": "World 2",
      "system": "Alchemy",
      "name": "AFK EXP doubling",
      "limit": "90% combined chance",
      "note": "AFK ExpExp, the bribe, guild bonus, card, Post Office and Superbit contribution share this cap. A higher displayed bubble value does not bypass it.",
      "evidence": {
        "offset": 5512415,
        "expression": "Math.min(90,c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.DubEXP)+q._customBlock_GetBribeBonus(\"7\")+(p._customBlock_GuildBonuses(15)+Math.min(w._customBlock_CardBonusREAL(47),20)+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.BoxRewards.h[\"14a\"])+15*m._customBlock_GamingStatType(\"SuperBitType\",10,0))))"
      },
      "id": "cap-015"
    },
    {
      "world": "World 2",
      "system": "Arcade",
      "name": "Arcade claim-time stamp",
      "limit": "+10 hours",
      "note": "The stamp adds at most 10 hours to the arcade claim-time allowance; this is not the total claim-time limit.",
      "evidence": {
        "offset": 7746628,
        "expression": "Math.min(10,k._customBlock_StampBonusOfTypeX(\"ArcadeTimeMax\"))"
      },
      "id": "cap-016"
    },
    {
      "world": "World 2",
      "system": "Arcade",
      "name": "Arcade ball-rate stamp",
      "limit": "+50%",
      "note": "Only the stamp’s contribution to arcade ball generation is clamped here. Other ball-generation bonuses still add.",
      "evidence": {
        "offset": 7747524,
        "expression": "Math.min(50,k._customBlock_StampBonusOfTypeX(\"ArcadeBallz\"))"
      },
      "id": "cap-017"
    },
    {
      "world": "World 2",
      "system": "Arcade",
      "name": "Gold Ball cost stamp",
      "limit": "40% reduction",
      "note": "Gold Ball upgrade costs retain at least 60% of their price from this stamp multiplier.",
      "evidence": {
        "offset": 7755319,
        "expression": "Math.max(.6,1-k._customBlock_StampBonusOfTypeX(\"GoldBallz\")/100)"
      },
      "id": "cap-018"
    },
    {
      "world": "World 3",
      "system": "Construction",
      "name": "Printer sample rate",
      "limit": "90%",
      "note": "The additive sample-rate pool caps at 90%. A larger sample-size bonus cannot make this pool exceed 90% of the sampled rate.",
      "evidence": {
        "offset": 7735648,
        "expression": "Math.min(.9,(k._customBlock_GetTalentNumber(1,635)+(p._customBlock_SaltLick(0)+w._customBlock_EtcBonuses(\"60\"))+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.SampleSize)+(k._customBlock_GetTalentNumber(1,133)+Math.min(1,p._customBlock_AchieveStatus(158))+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchVials.h.SampleSize)+(p._customBlock_prayersReal(9,0)+(k._customBlock_StampBonusOfTypeX(\"SampleRate\")+(Math.min(5,.5*c.asNumber(a.engine.getGameAttribute(\"Tasks\")[2][2][4]))+(Math.min(5,c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.FamBonusQTYs.h[6]))+(p._customBlock_ArcadeBonus(5)+c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.BoxRewards.h[\"13a\"]))))))))))/100)"
      },
      "id": "cap-019"
    },
    {
      "world": "World 3",
      "system": "Construction",
      "name": "Printer family bonus",
      "limit": "+5 percentage points",
      "note": "The family-bonus contribution to sample rate is separately limited to 5, before the overall 90% sample-rate cap.",
      "evidence": {
        "offset": 7736145,
        "expression": "Math.min(5,c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.FamBonusQTYs.h[6]))"
      },
      "id": "cap-020"
    },
    {
      "world": "World 3",
      "system": "Construction",
      "name": "Cost Cruncher salt discount",
      "limit": "80% reduction",
      "note": "The Cost Cruncher multiplier on construction salt cost bottoms out at 20%.",
      "evidence": {
        "offset": 7734230,
        "expression": "Math.max(.2,1-(Math.min(.1,.1*Math.floor((c.asNumber(a.engine.getGameAttribute(\"TowerInfo\")[5])+999)/1e3))+Math.max(0,c.asNumber(a.engine.getGameAttribute(\"TowerInfo\")[5])-1)*c.asNumber(a.engine.getGameAttribute(\"CustomLists\").h.TowerInfo[5][2])/100))"
      },
      "id": "cap-021"
    },
    {
      "world": "World 4",
      "system": "Breeding",
      "name": "Curviture of the Paw",
      "limit": "2.1×",
      "note": "The Beast Master talent’s multiplier in the pet-power calculation is clamped to 2.1×.",
      "evidence": {
        "offset": 7844672,
        "expression": "Math.min(2.1,Math.max(1,p._customBlock_getbonus2(1,373,-1)))"
      },
      "id": "cap-022"
    },
    {
      "world": "World 4",
      "system": "Breeding",
      "name": "Genetic cost discount",
      "limit": "99% reduction",
      "note": "The breeding upgrade’s genetic-cost multiplier cannot fall below 0.01.",
      "evidence": {
        "offset": 7848465,
        "expression": "Math.max(.01,1-p._customBlock_Breeding(\"PetUpgBONUS\",\"0\",1,0)/100)"
      },
      "id": "cap-023"
    },
    {
      "world": "World 4",
      "system": "Lab",
      "name": "Line-width EXP contribution",
      "limit": "+100%",
      "note": "The four-times-line-width contribution to Lab EXP caps at +100%. This caps that EXP contribution, not Lab line width itself.",
      "evidence": {
        "offset": 4211375,
        "expression": "Math.min(100,4*p._customBlock_Labb(\"BonusLineWidth\",\"0\",a.engine.getGameAttribute(\"GetPlayersUsernames\").indexOf(a.engine.getGameAttribute(\"UserInfo\")[0]),0))"
      },
      "id": "cap-024"
    },
    {
      "world": "World 4",
      "system": "Cooking",
      "name": "Equinox meal discount",
      "limit": "99.9% reduction",
      "note": "The repeated Equinox meal-cost multiplier has a 0.001 floor. Other independent cost multipliers still apply.",
      "evidence": {
        "offset": 7811119,
        "expression": "Math.max(.001,Math.pow(Math.max(.58,.8-.22*m._customBlock_Dreamstuff(\"CloudBonus\",33)),Math.min(c.asNumber(a.engine.getGameAttribute(\"OptionsListAccount\")[193]),c.asNumber(a.engine.getGameAttribute(\"Dream\")[11]))))"
      },
      "id": "cap-025"
    },
    {
      "world": "World 5",
      "system": "Divinity",
      "name": "Gifts Abound",
      "limit": "35%",
      "note": "Chance to keep Divinity points when making an offering. The spending routine caps the bubble at 35%, even if its tooltip shows more.",
      "evidence": {
        "offset": 10258763,
        "expression": "Math.min(.35,c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.Y4)/100)"
      },
      "id": "cap-026"
    },
    {
      "world": "World 5",
      "system": "Sailing",
      "name": "Minimum travel-time reduction",
      "limit": "15 minutes minimum",
      "note": "Bonuses that lower the minimum voyage time cannot lower it below 15 minutes. Actual trips can still take longer.",
      "evidence": {
        "offset": 10573669,
        "expression": "Math.max(15,120/(1+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.FamBonusQTYs.h[44])+(p._customBlock_Breeding(\"ShinyBonusS\",\"Nah\",18,-1)+m._customBlock_Thingies(\"LegendPTS_bonus\",11,0)))/100)-4*c.asNumber(a.engine.getGameAttribute(\"GemItemsPurchased\")[8]))"
      },
      "id": "cap-027"
    },
    {
      "world": "World 5",
      "system": "Gaming",
      "name": "POING high-score multiplier",
      "limit": "25×",
      "note": "The POING multiplier used for bit gain stops at 25×, even if the standalone high-score formula continues increasing.",
      "evidence": {
        "offset": 10624306,
        "expression": "Math.min(25,m._customBlock_GamingStatType(\"GamingPOINGmulti\",0,0))"
      },
      "id": "cap-028"
    },
    {
      "world": "World 5",
      "system": "Gaming",
      "name": "Sprinkler preservation",
      "limit": "82%",
      "note": "The combined gem-shop sprinkler preservation and Palette bonus cannot exceed an 82% chance.",
      "evidence": {
        "offset": 10435143,
        "expression": "Math.min(.82,m._customBlock_GamingStatType(\"SaveSprinkler\",0,0)+m._customBlock_GamingStatType(\"PaletteBonus\",16,0)/100)"
      },
      "id": "cap-029"
    },
    {
      "world": "World 5",
      "system": "Gaming",
      "name": "Chemical preservation",
      "limit": "80%",
      "note": "Chemical import and Palette preservation bonuses share an 80% limit.",
      "evidence": {
        "offset": 10441988,
        "expression": "Math.min(.8,(m._customBlock_GamingStatType(\"ImportItemBonus\",5,0)+m._customBlock_GamingStatType(\"PaletteBonus\",9,0))/100)"
      },
      "id": "cap-030"
    },
    {
      "world": "World 5",
      "system": "Gaming",
      "name": "First mutation discovery",
      "limit": "80%",
      "note": "The new-mutant discovery roll is capped at 80% while the mutation count is zero.",
      "evidence": {
        "offset": 10627721,
        "expression": "Math.min(.8,7*c.asNumber(a.engine.getGameAttribute(\"Gaming\")[5])/(100+c.asNumber(a.engine.getGameAttribute(\"Gaming\")[5]))*(1+m._customBlock_Summoning(\"VotingBonusz\",21,0)/100))"
      },
      "id": "cap-031"
    },
    {
      "world": "World 5",
      "system": "Gaming",
      "name": "Later mutation discovery",
      "limit": "99%",
      "note": "After the first mutation, the new-mutant discovery chance is capped at 99%.",
      "evidence": {
        "offset": 10627898,
        "expression": "Math.min(.99,42*c.asNumber(a.engine.getGameAttribute(\"Gaming\")[5])/(100+c.asNumber(a.engine.getGameAttribute(\"Gaming\")[5]))*Math.pow(.31,c.asNumber(a.engine.getGameAttribute(\"Gaming\")[4]))*(1+m._customBlock_Summoning(\"VotingBonusz\",21,0)/100)*(1+10*Math.pow(Math.max(0,c.asNumber(a.engine.getGameAttribute(\"OptionsListAccount\")[342])/(70*Math.pow(1.7,c.asNumber(a.engine.getGameAttribute(\"Gaming\")[4]))+c.asNumber(a.engine.getGameAttribute(\"OptionsListAccount\")[342]))),2)))"
      },
      "id": "cap-032"
    },
    {
      "world": "World 5",
      "system": "The Hole",
      "name": "Bravery opal reward chance",
      "limit": "50%",
      "note": "Bravery’s opal reward roll cannot exceed 50% after its bonuses are applied.",
      "evidence": {
        "offset": 10883850,
        "expression": "Math.min(.5,Math.pow(.5,c.asNumber(a.engine.getGameAttribute(\"Holes\")[7][3]))*(1+m._customBlock_Holes(\"MonumentROGbonuses\",0,5)/100))"
      },
      "id": "cap-033"
    },
    {
      "world": "World 5",
      "system": "The Hole",
      "name": "Justice opal reward chance",
      "limit": "50%",
      "note": "Justice’s opal reward roll cannot exceed 50%, including its study bonus.",
      "evidence": {
        "offset": 10894827,
        "expression": "Math.min(.5,Math.pow(.5,c.asNumber(a.engine.getGameAttribute(\"Holes\")[7][9]))*(1+m._customBlock_Holes(\"MonumentROGbonuses\",1,5)/100)*(1+m._customBlock_Holes(\"StudyBolaiaBonuses\",9,0)/100))"
      },
      "id": "cap-034"
    },
    {
      "world": "World 5",
      "system": "The Hole",
      "name": "Wisdom opal reward chance",
      "limit": "50%",
      "note": "Wisdom’s opal reward roll cannot exceed 50% after its bonuses are applied.",
      "evidence": {
        "offset": 10903379,
        "expression": "Math.min(.5,Math.pow(.5,c.asNumber(a.engine.getGameAttribute(\"Holes\")[7][12]))*(1+m._customBlock_Holes(\"MonumentROGbonuses\",2,5)/100))"
      },
      "id": "cap-035"
    },
    {
      "world": "World 6",
      "system": "Sneaking",
      "name": "Ninja Looter item-find contribution",
      "limit": "2×",
      "note": "The bonus portion of Ninja Looter is clamped to +100%, making its effective item-find multiplier at most 2×.",
      "evidence": {
        "offset": 10742065,
        "expression": "Math.min(100,100*(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.Y9ACTIVE)-1))"
      },
      "id": "cap-036"
    },
    {
      "world": "World 6",
      "system": "Farming",
      "name": "Day Market discounts",
      "limit": "90% each",
      "note": "Exotic Market discounts 34 and 35 each stop at 90%. They multiply separately; this is not a combined 90% limit.",
      "evidence": {
        "offset": 10705738,
        "expression": "Math.max(.1,1-m._customBlock_FarmingStuffs(\"ExoticBonusQTY\",34,0)/100)"
      },
      "id": "cap-037"
    },
    {
      "world": "World 6",
      "system": "Farming",
      "name": "Night Market discounts",
      "limit": "90% each",
      "note": "Exotic Market discounts 36 and 37 each stop at 90%. They multiply separately.",
      "evidence": {
        "offset": 10706006,
        "expression": "Math.max(.1,1-m._customBlock_FarmingStuffs(\"ExoticBonusQTY\",36,0)/100)"
      },
      "id": "cap-038"
    },
    {
      "world": "World 6",
      "system": "Summoning",
      "name": "Unit dodge",
      "limit": "80%",
      "note": "All summon types use an 80% maximum dodge chance, including the unit with its additional dodge upgrade.",
      "evidence": {
        "offset": 10795982,
        "expression": "Math.min(.8,(m._customBlock_Summoning(\"SummUpgBonus\",9,0)+(m._customBlock_Summoning(\"SummUpgBonus\",7,0)+m._customBlock_Summoning(\"SummUpgBonus\",55,0)))/100)"
      },
      "id": "cap-039"
    },
    {
      "world": "World 6",
      "system": "Summoning",
      "name": "Sushi upgrade-cost discount",
      "limit": "90% reduction",
      "note": "The stronger of the two relevant Sushi bonuses is used, with a 10% remaining-cost floor.",
      "evidence": {
        "offset": 10797741,
        "expression": "Math.max(.1,1-Math.max(m._customBlock_SushiStuff(\"RoG_BonusQTY\",9,0),m._customBlock_SushiStuff(\"RoG_BonusQTY\",34,0))/100)"
      },
      "id": "cap-040"
    },
    {
      "world": "World 7",
      "system": "Spelunking",
      "name": "Deep Depth / holes to next floor",
      "limit": "3 holes",
      "note": "The next-floor hole roll caps at three, including the Deep Depth bubble and the shop bonus.",
      "evidence": {
        "offset": 10990426,
        "expression": "Math.min(3,1+(c.randomFloat()+(m._customBlock_Spelunk(\"ShopUpgBonus\",18,0)+c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.M11))/100))"
      },
      "id": "cap-041"
    },
    {
      "world": "World 7",
      "system": "Spelunking",
      "name": "Multi-resource value",
      "limit": "100",
      "note": "The Spelunking multi-resource formula caps its value at 100, including its bubble and Jelly bonuses.",
      "evidence": {
        "offset": 10995151,
        "expression": "Math.min(100,2+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.W11)+q._customBlock_JellyOperation(\"RoG_BonusQTY\",47,0)))"
      },
      "id": "cap-042"
    },
    {
      "world": "World 7",
      "system": "Spelunking",
      "name": "Action speed",
      "limit": "2 seconds minimum",
      "note": "The action interval cannot drop below two seconds, regardless of additional speed bonuses.",
      "evidence": {
        "offset": 10994808,
        "expression": "Math.max(2,40/(1+(k._customBlock_GetTalentNumber(1,637)+(w._customBlock_EtcBonuses(\"61\")+(Math.round(p._customBlock_MainframeBonus(112)/20)+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchVials.h[\"7spelunkspd\"])+(m._customBlock_Spelunk(\"ChapterBonus\",0,2)+k._customBlock_GetTalentNumber(2,237))))))/100))"
      },
      "id": "cap-043"
    },
    {
      "world": "World 7",
      "system": "Spelunking",
      "name": "Elixir preservation",
      "limit": "60%",
      "note": "Shop and chapter bonuses share a 60% chance to avoid consuming an elixir.",
      "evidence": {
        "offset": 10985019,
        "expression": "Math.min(.6,(m._customBlock_Spelunk(\"ShopUpgBonus\",26,0)+m._customBlock_Spelunk(\"ChapterBonus\",3,2))/100)"
      },
      "id": "cap-044"
    },
    {
      "world": "World 7",
      "system": "Spelunking",
      "name": "Amber drop chance",
      "limit": "80%",
      "note": "The final amber-drop roll caps at 80%, after the supply-swap modifier.",
      "evidence": {
        "offset": 10989618,
        "expression": "Math.min(.8,1/(1+9*m._customBlock_Spelunk(\"ShopUpgBonus\",67,0))*((m._customBlock_Spelunk(\"ShopUpgBonus\",7,0)+m._customBlock_Spelunk(\"ShopUpgBonus\",52,0))/100))"
      },
      "id": "cap-045"
    },
    {
      "world": "World 7",
      "system": "Spelunking",
      "name": "Sushi + Jelly upgrade discount",
      "limit": "90% combined reduction",
      "note": "The better Sushi discount plus Jelly share a 90% limit. Other cost multipliers remain independent.",
      "evidence": {
        "offset": 10976594,
        "expression": "Math.max(.1,1-(Math.max(m._customBlock_SushiStuff(\"RoG_BonusQTY\",6,0),m._customBlock_SushiStuff(\"RoG_BonusQTY\",27,0))+q._customBlock_JellyOperation(\"RoG_BonusQTY\",22,0))/100)"
      },
      "id": "cap-046"
    },
    {
      "world": "World 7",
      "system": "Gallery",
      "name": "Codfrey Rulz OK",
      "limit": "+20%",
      "note": "The bubble’s contribution to Gallery Bonus Multi stops at +20%. Other Gallery bonus sources still add.",
      "evidence": {
        "offset": 11002852,
        "expression": "Math.min(20,c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.Y13))"
      },
      "id": "cap-047"
    },
    {
      "world": "World 7",
      "system": "Research",
      "name": "Research AFK gain rate",
      "limit": "100%",
      "note": "The combined Research AFK-rate formula caps at 100%; additional AFK-rate bonuses above that do not increase it.",
      "evidence": {
        "offset": 4412704,
        "expression": "Math.min(1,.01+(m._customBlock_Companions(28)+(m._customBlock_Holes(\"GambitBonuses\",15,0)+(m._customBlock_Minehead(\"BonusQTY\",1,0)+(m._customBlock_Minehead(\"BonusQTY\",10,0)+(m._customBlock_ResearchStuff(\"Grid_Bonus\",71,0)+(m._customBlock_ResearchStuff(\"Grid_Bonus\",111,0)+(Math.min(6,Math.round(c.asNumber(a.engine.getGameAttribute(\"Sailing\")[3][36])))+(Math.min(x._customBlock_RunCodeOfTypeXforThingY(\"CardLv\",\"w7b11\"),10)+(20*m._customBlock_Companions(153)+10*m._customBlock_CompLV2(153)+(2*c.asNumber(a.engine.getGameAttribute(\"GemItemsPurchased\")[45])+(m._customBlock_SushiStuff(\"RoG_BonusQTY\",4,0)+m._customBlock_SushiStuff(\"RoG_BonusQTY\",24,0))))))))))))/100)"
      },
      "id": "cap-048"
    },
    {
      "world": "World 7",
      "system": "Minehead",
      "name": "Sushi upgrade-cost discount",
      "limit": "90% reduction",
      "note": "The stronger relevant Sushi discount is capped at 90%. The Minehead upgrade discount is a separate factor.",
      "evidence": {
        "offset": 11047772,
        "expression": "Math.max(.1,1-Math.max(m._customBlock_SushiStuff(\"RoG_BonusQTY\",1,0),m._customBlock_SushiStuff(\"RoG_BonusQTY\",16,0))/100)"
      },
      "id": "cap-049"
    },
    {
      "world": "World 7",
      "system": "Minehead",
      "name": "Currency-gain bonus factor",
      "limit": "3×",
      "note": "The Minehead bonus #6 factor contributes at most 3× currency gain. This does not cap the total currency multiplier.",
      "evidence": {
        "offset": 11055667,
        "expression": "Math.min(3,1+m._customBlock_Minehead(\"BonusQTY\",6,0)/100)"
      },
      "id": "cap-050"
    },
    {
      "world": "World 7",
      "system": "Minehead",
      "name": "Blue crown chance",
      "limit": "10%",
      "note": "Once blue crowns are unlocked, the crown chance cannot exceed 10%.",
      "evidence": {
        "offset": 11056635,
        "expression": "Math.min(.1,.06666666666666667*(1+m._customBlock_Minehead(\"UpgradeQTY\",15,0)/100))"
      },
      "id": "cap-051"
    },
    {
      "world": "World 7",
      "system": "Sushi",
      "name": "Free shaker chance",
      "limit": "60%",
      "note": "The upgrade, Knowledge and Research contributions share a 60% free-shaker limit.",
      "evidence": {
        "offset": 11075867,
        "expression": "Math.min(.6,(m._customBlock_SushiStuff(\"UpgradeQTY\",21,0)+(m._customBlock_SushiStuff(\"KnowledgeBonusTOT\",5,0)+m._customBlock_ResearchStuff(\"Grid_Bonus\",188,0)))/100)"
      },
      "id": "cap-052"
    },
    {
      "world": "World 7",
      "system": "Sushi",
      "name": "Minehead currency contribution",
      "limit": "1.25×",
      "note": "The Minehead bonus #11 multiplier in Sushi currency gain is capped at 1.25×. Other currency bonuses remain independent.",
      "evidence": {
        "offset": 11071780,
        "expression": "Math.min(1.25,1+m._customBlock_Minehead(\"BonusQTY\",11,0)/100)"
      },
      "id": "cap-053"
    },
    {
      "world": "World 7",
      "system": "Sushi",
      "name": "Sushi upgrade-cost discount",
      "limit": "90% reduction",
      "note": "The better of the two Sushi cost-discount bonuses leaves at least 10% of the cost.",
      "evidence": {
        "offset": 11067366,
        "expression": "Math.max(.1,1-Math.max(m._customBlock_SushiStuff(\"RoG_BonusQTY\",26,0),m._customBlock_SushiStuff(\"RoG_BonusQTY\",44,0))/100)"
      },
      "id": "cap-054"
    },
    {
      "world": "World 7",
      "system": "Jelly",
      "name": "Sushi organelle-speed bonus",
      "limit": "+0.25×",
      "note": "Sushi adds at most 0.25 to the organelle speed factor, raising the base 1.5× to at most 1.75×.",
      "evidence": {
        "offset": 5128198,
        "expression": "Math.min(.25,Math.max(0,m._customBlock_SushiStuff(\"RoG_BonusQTY\",63,0)/100))"
      },
      "id": "cap-055"
    },
    {
      "world": "Masterclasses",
      "system": "Wind Walker",
      "name": "Tempest damage mastery",
      "limit": "70%",
      "note": "Compass mastery is clamped to 70%; further mastery bonuses cannot raise this damage-floor fraction.",
      "evidence": {
        "offset": 10936036,
        "expression": "Math.min(.7,.2+m._customBlock_Windwalker(\"CompassBonus\",70,0)/100)"
      },
      "id": "cap-056"
    },
    {
      "world": "Masterclasses",
      "system": "Wind Walker",
      "name": "Tempest multishot",
      "limit": "800%",
      "note": "Combined Compass upgrades and talent scaling cannot raise the multishot value above 800%.",
      "evidence": {
        "offset": 10937183,
        "expression": "Math.min(800,m._customBlock_Windwalker(\"CompassBonus\",18,0)+(m._customBlock_Windwalker(\"CompassBonus\",125,0)+m._customBlock_Windwalker(\"CompassBonus\",73,0)+k._customBlock_GetTalentNumber(2,426)*(m._customBlock_Windwalker(\"CompassUpgTotal\",0,0)/100)))"
      },
      "id": "cap-057"
    },
    {
      "world": "Masterclasses",
      "system": "Arcane Cultist",
      "name": "Prisma bubble multiplier",
      "limit": "4×",
      "note": "The combined Prisma multiplier stops at 4× in this client. Individual bubbles can still hit their own lower effective limits.",
      "evidence": {
        "offset": 10951804,
        "expression": "Math.min(4,2+(m._customBlock_ArcaneType(\"ArcaneUpgBonus\",45,0)+(p._customBlock_ArcadeBonus(54)+(m._customBlock_SushiStuff(\"RoG_BonusQTY\",23,0)+q._customBlock_JellyOperation(\"RoG_BonusQTY\",36,0))+(m._customBlock_Thingies(\"HaveW6Trophy\",0,0)+(m._customBlock_GamingStatType(\"PaletteBonus\",28,0)+(.2*p._customBlock_Labb(\"TotalPurpleSigils\",\"0\",0,0)+m._customBlock_FarmingStuffs(\"ExoticBonusQTY\",48,0)))))+(m._customBlock_Thingies(\"LegendPTS_bonus\",36,0)+50*m._customBlock_Companions(88)))/100)"
      },
      "id": "cap-058"
    },
    {
      "world": "Masterclasses",
      "system": "Arcane Cultist",
      "name": "Extra arcane monster spawns",
      "limit": "+3 monsters",
      "note": "The random additional-spawn term from the Tesseract upgrade is capped at three. Base talent spawns are added separately.",
      "evidence": {
        "offset": 10952580,
        "expression": "Math.min(3,c.randomFloat()+m._customBlock_ArcaneType(\"ArcaneUpgBonus\",26,0)/100)"
      },
      "id": "cap-059"
    },
    {
      "world": "Masterclasses",
      "system": "Arcane Cultist",
      "name": "Map-bonus cap upgrade",
      "limit": "+10",
      "note": "The Tesseract upgrade adds at most 10 to the arcane map-bonus ceiling. The talent portion is separate.",
      "evidence": {
        "offset": 10954000,
        "expression": "Math.min(10,m._customBlock_ArcaneType(\"ArcaneUpgBonus\",58,0))"
      },
      "id": "cap-060"
    },
    {
      "world": "Masterclasses",
      "system": "Arcane Cultist",
      "name": "All-talent-level upgrade",
      "limit": "+5 levels",
      "note": "The Tesseract all-talent-level contribution is capped at five; other talent-level sources are separate.",
      "evidence": {
        "offset": 4051460,
        "expression": "Math.min(5,m._customBlock_ArcaneType(\"ArcaneUpgBonus\",57,0))"
      },
      "id": "cap-061"
    },
    {
      "world": "Masterclasses",
      "system": "Royal Guardian",
      "name": "Royal Riches",
      "limit": "+50%",
      "note": "The bubble contributes at most +50% to outpost resource collection rate.",
      "evidence": {
        "offset": 11096862,
        "expression": "Math.min(50,c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.W14))"
      },
      "id": "cap-062"
    },
    {
      "world": "Masterclasses",
      "system": "Royal Guardian",
      "name": "Rat respawn speed",
      "limit": "5 seconds minimum",
      "note": "Armory respawn-speed bonuses cannot reduce the rat respawn interval below five seconds.",
      "evidence": {
        "offset": 11086847,
        "expression": "Math.max(5,60/(1+(m._customBlock_RoyalG(\"ArmoryUpgBonus\",33,0)+m._customBlock_RoyalG(\"ArmoryUpgBonus\",34,0))/100))"
      },
      "id": "cap-063"
    },
    {
      "world": "Masterclasses",
      "system": "Royal Guardian",
      "name": "Parchment recycling",
      "limit": "75%",
      "note": "Parchment recycling chance from the Armory is capped at 75%.",
      "evidence": {
        "offset": 11087475,
        "expression": "Math.min(.75,m._customBlock_RoyalG(\"ArmoryUpgBonus\",40,0)/100)"
      },
      "id": "cap-064"
    },
    {
      "world": "Account",
      "system": "Combat",
      "name": "Normal damage mastery",
      "limit": "80%",
      "note": "The ordinary damage calculation clamps mastery to 80%. Masterclass modes have their own formulas.",
      "evidence": {
        "offset": 4070766,
        "expression": "Math.min(.8,.35-k._customBlock_GetTalentNumber(2,113)/100+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.Mastery)+(w._customBlock_CardBonusREAL(21)+(k._customBlock_GetTalentNumber(1,123)+w._customBlock_EtcBonuses(\"21\"))))/100)"
      },
      "id": "cap-065"
    },
    {
      "world": "Account",
      "system": "Combat",
      "name": "Normal bow attack interval",
      "limit": "0.05 seconds minimum",
      "note": "The normal bow attack formula has a 0.05-second floor. Tempest and Arcanist branches use different formulas; animation timing can impose further limits.",
      "evidence": {
        "offset": 4219445,
        "expression": "Math.max(.05,(.7+(10-c.asNumber(a.engine.getGameAttribute(\"DummyNumbersStatManager\").h.WaitTimeSPD))/5+.1)/(1+(w._customBlock_EtcBonuses(\"56\")+(q._customBlock_MealBonus(\"AtkSpd\")+(q._customBlock_chipBonuses(\"atkspd\")+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.BAspd)+c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.BoxRewards.h[\"12b\"])))))/100))"
      },
      "id": "cap-066"
    },
    {
      "world": "Account",
      "system": "Combat",
      "name": "AFK attack interval",
      "limit": "0.1 seconds minimum",
      "note": "The attack interval used by the AFK calculation cannot fall below 0.1 seconds. This is not a cap on the displayed attack-speed bonus.",
      "evidence": {
        "offset": 4220639,
        "expression": "Math.max(.1,(1+(10-c.asNumber(a.engine.getGameAttribute(\"DummyNumbersStatManager\").h.WaitTimeSPD))/5)/(1+(w._customBlock_EtcBonuses(\"56\")+(q._customBlock_MealBonus(\"AtkSpd\")+(q._customBlock_chipBonuses(\"atkspd\")+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.BAspd)+c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.BoxRewards.h[\"12b\"])))))/100))"
      },
      "id": "cap-067"
    },
    {
      "world": "Account",
      "system": "Combat",
      "name": "Movement-speed ceiling",
      "limit": "219%",
      "note": "The final movement function clamps its speed multiplier to 2.19. Earlier movement-speed branches can impose lower limits.",
      "evidence": {
        "offset": 4102356,
        "expression": "Math.min(2.19,x._customBlock_PlayerSpeedBonus())"
      },
      "id": "cap-068"
    },
    {
      "world": "Account",
      "system": "Skilling",
      "name": "Shared prowess contribution",
      "limit": "+0.10 exponent",
      "note": "Prowesessary, the prowess star sign and the prowess meal share a +0.10 limit in the prowess calculation. Other skill-specific contributions are separate.",
      "evidence": {
        "offset": 4022581,
        "expression": "Math.min(.1,(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.ProwessMulti)-1)/10+(.001*c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.StarSigns.h.SkillProw)+5e-4*q._customBlock_MealBonus(\"Sprow\")))"
      },
      "id": "cap-069"
    },
    {
      "world": "Account",
      "system": "Skilling",
      "name": "Multi-ore",
      "limit": "100% / 300% + Cosmo",
      "note": "The base multi-ore cap is 100%, or 300% when Wyoming Blood supplies at least 20%. Cosmo’s bonus raises either ceiling.",
      "evidence": {
        "offset": 4166477,
        "expression": "MiningMultiOre\"==e)return-1!=c.getCurrentSceneName().indexOf(\"Tutorial\")?100:(t=a.engine.getGameAttribute(\"DNSM\"),i=k._customBlock_StampBonusOfTypeX(\"DoubleMin\")+100*(Math.pow(c.asNumber(a.engine.getGameAttribute(\"DummyNumbersStatManager\").h.SkillStatsDN),.5)/(10*Math.pow(c.asNumber(a.engine.getGameAttribute(\"DummyNumbersStatManager\").h.SkillStatsDN),.5)+50)+(.1*c.asNumber(a.engine.getGameAttribute(\"Lv0\")[1])/(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[1])+40)+k._customBlock_GetTalentNumber(1,102)/100))+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.MiningACTIVE)+c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.StarSigns.h.MultiOre)),t.h.SkillageDN=i,20>c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.MiningACTIVE)?(t=a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP,i=Math.min(100+m._customBlock_Holes(\"CosmoBonusQTY\",2,2),c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.SkillageDN))):(t=a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP,i=Math.min(300+m._customBlock_Holes(\"CosmoBonusQTY\",2,2),c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.SkillageDN))),t.h[e]=i,a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP.h[e]);if(\"MiningMaxOre\"==e)return a.engine.getGameA"
      },
      "id": "cap-070"
    },
    {
      "world": "Account",
      "system": "Skilling",
      "name": "Multi-log",
      "limit": "100% / 300% + Cosmo",
      "note": "The base multi-log cap is 100%, or 300% when its active bubble supplies at least 20%. Cosmo’s bonus raises either ceiling.",
      "evidence": {
        "offset": 4175589,
        "expression": "ChoppinMultiOre\"==e)return-1!=c.getCurrentSceneName().indexOf(\"Tutorial\")?100:(t=a.engine.getGameAttribute(\"DNSM\"),i=k._customBlock_StampBonusOfTypeX(\"DoubleChop\")+w._customBlock_EtcBonuses(\"6\")+100*(Math.pow(c.asNumber(a.engine.getGameAttribute(\"DummyNumbersStatManager\").h.SkillStatsDN),.5)/(4*Math.pow(c.asNumber(a.engine.getGameAttribute(\"DummyNumbersStatManager\").h.SkillStatsDN),.5)+50)+.15*c.asNumber(a.engine.getGameAttribute(\"Lv0\")[3])/(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[3])+40))+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.MultiLogACTIVE)+c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.StarSigns.h.MultiLog)),t.h.SkillageDN=i,20>c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.MultiLogACTIVE)?(t=a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP,i=Math.min(100+m._customBlock_Holes(\"CosmoBonusQTY\",2,2),c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.SkillageDN))):(t=a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP,i=Math.min(300+m._customBlock_Holes(\"CosmoBonusQTY\",2,2),c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.SkillageDN))),t.h[e]=i,a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP.h[e]);if(\"ChoppinMaxOre\"==e)return 8;if(\"ChoppinSpeed\"==e)"
      },
      "id": "cap-071"
    },
    {
      "world": "Account",
      "system": "Skilling",
      "name": "Multi-fish",
      "limit": "100% / 300% + Cosmo",
      "note": "The base multi-fish cap is 100%, or 300% when Sploosh Sploosh supplies at least 20%. Cosmo’s bonus raises either ceiling.",
      "evidence": {
        "offset": 4183081,
        "expression": "FishingMultiOre\"==e)return t=a.engine.getGameAttribute(\"DNSM\"),i=k._customBlock_StampBonusOfTypeX(\"DoubleFish\")+100*(Math.pow(c.asNumber(a.engine.getGameAttribute(\"DummyNumbersStatManager\").h.SkillStatsDN),.5)/(4*Math.pow(c.asNumber(a.engine.getGameAttribute(\"DummyNumbersStatManager\").h.SkillStatsDN),.5)+50)+.15*c.asNumber(a.engine.getGameAttribute(\"Lv0\")[4])/(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[4])+40))+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.FishingACTIVE)+c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.StarSigns.h.MultiFish)),t.h.SkillageDN=i,20>c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.FishingACTIVE)?(t=a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP,i=Math.min(100+m._customBlock_Holes(\"CosmoBonusQTY\",2,2),c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.SkillageDN))):(t=a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP,i=Math.min(300+m._customBlock_Holes(\"CosmoBonusQTY\",2,2),c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.SkillageDN))),t.h[e]=i,a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP.h[e];if(\"FishingMaxOre\"==e)return 8;if(\"FishingSpeed\"==e)return t=a.engine.getGameAttribute(\"ItemDefinitionsGET\"),r=\"\"+h.string(a.engine.getGa"
      },
      "id": "cap-072"
    },
    {
      "world": "Account",
      "system": "Skilling",
      "name": "Multi-bug",
      "limit": "100% / 300% + Cosmo",
      "note": "The base multi-bug cap is 100%, or 300% when its active bubble supplies at least 20%. Cosmo’s bonus raises either ceiling.",
      "evidence": {
        "offset": 4192516,
        "expression": "CatchingMultiOre\"==e?(t=a.engine.getGameAttribute(\"DNSM\"),i=k._customBlock_StampBonusOfTypeX(\"DoubleCatch\")+100*(Math.pow(c.asNumber(a.engine.getGameAttribute(\"DummyNumbersStatManager\").h.SkillStatsDN),.5)/(4*Math.pow(c.asNumber(a.engine.getGameAttribute(\"DummyNumbersStatManager\").h.SkillStatsDN),.5)+50)+.15*c.asNumber(a.engine.getGameAttribute(\"Lv0\")[6])/(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[6])+40))+(c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.CatchingACTIVE)+c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.StarSigns.h.MultiBug)),t.h.SkillageDN=i,20>c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.AlchBubbles.h.CatchingACTIVE)?Math.min(100+m._customBlock_Holes(\"CosmoBonusQTY\",2,2),c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.SkillageDN)):Math.min(300+m._customBlock_Holes(\"CosmoBonusQTY\",2,2),c.asNumber(a.engine.getGameAttribute(\"DNSM\").h.SkillageDN))):\"CatchingMaxOre\"==e?8:\"CatchingSpeed\"==e?(t=a.engine.getGameAt"
      },
      "id": "cap-073"
    },
    {
      "world": "Account",
      "system": "Skilling",
      "name": "Mining action speed",
      "limit": "0.57 seconds minimum",
      "note": "The Mining speed calculation has a 0.57-second floor. More speed beyond that cannot shorten this interval.",
      "evidence": {
        "offset": 4167774,
        "expression": "MiningSpeed\"==e)return t=a.engine.getGameAttribute(\"ItemDefinitionsGET\"),r=\"\"+h.string(a.engine.getGameAttribute(\"EquipmentOrder\")[1][0]),3>c.asNumber(t.h[r].h.Speed)?(t=a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP,s=a.engine.getGameAttribute(\"ItemDefinitionsGET\"),r=\"\"+h.string(a.engine.getGameAttribute(\"EquipmentOrder\")[1][0]),i=Math.max((5.7+Math.pow(4-c.asNumber(s.h[r].h.Speed),2.2)-(.9*Math.pow(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[1]),.5)/(Math.pow(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[1]),.5)+250)+.6*c.asNumber(a.engine.getGameAttribute(\"Lv0\")[1])/(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[1])+40)))/(1+(q._customBlock_TotalFoodBonuses(\"MiningSpeedBoosts\")+(w._customBlock_CardBonusREAL(34)+(k._customBlock_GetTalentNumber(1,637)+(w._customBlock_EtcBonuses(\"61\")+Math.round(p._customBlock_MainframeBonus(112)/20)))))/100),.57)):(t=a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP,s=a.engine.getGameAttribute(\"ItemDefinitionsGET\"),r=\"\"+h.string(a.engine.getGameAttribute(\"EquipmentOrder\")[1][0]),i=Math.max((5.7-(.2*Math.pow(c.asNumber(s.h[r].h.Speed),1.3)+(.9*Math.pow(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[1]),.5)/(Math.pow(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[1]),.5)+250)+.6*c.asNumber(a.engine.getGameAttribute(\"Lv0\")[1])/(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[1])+40))))/(1+(q._customBlock_TotalFoodBonuses(\"MiningSpeedBoosts\")+(w._customBlock_CardBonusREAL(34)+(k._customBlock_GetTalentNumber(1,637)+(w._customBlock_EtcBonuses(\"61\")+Math.round(p._customBlock_MainframeBonus(112)/20)))))/100),.57)),t.h[e]=i,a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP.h[e];if(\"MiningEXPmulti\"==e)return a.engine.getGameAttribute(\"DNSM\").h.SkillageDN=0,c.asNumber(a.engine.getGameAttribute(\"Lv0\")[1])<c.asNumber(a.engine.getGameAttribute(\"Lv0\")[4])?(t=a.eng"
      },
      "id": "cap-074"
    },
    {
      "world": "Account",
      "system": "Skilling",
      "name": "Chopping action speed",
      "limit": "0.57 seconds minimum",
      "note": "The Chopping speed calculation has a 0.57-second floor. More speed beyond that cannot shorten this interval.",
      "evidence": {
        "offset": 4176772,
        "expression": "ChoppinSpeed\"==e)return t=a.engine.getGameAttribute(\"ItemDefinitionsGET\"),r=\"\"+h.string(a.engine.getGameAttribute(\"EquipmentOrder\")[1][1]),3>c.asNumber(t.h[r].h.Speed)?(t=a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP,s=a.engine.getGameAttribute(\"ItemDefinitionsGET\"),r=\"\"+h.string(a.engine.getGameAttribute(\"EquipmentOrder\")[1][1]),i=Math.max((5.7+Math.pow(4-c.asNumber(s.h[r].h.Speed),2.2)-(.9*Math.pow(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[3]),.5)/(Math.pow(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[3]),.5)+250)+.6*c.asNumber(a.engine.getGameAttribute(\"Lv0\")[3])/(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[3])+40)))/(1+(q._customBlock_TotalFoodBonuses(\"ChoppinSpeedBoosts\")+(w._customBlock_CardBonusREAL(37)+(k._customBlock_GetTalentNumber(1,637)+(w._customBlock_EtcBonuses(\"61\")+Math.round(p._customBlock_MainframeBonus(112)/20)))))/100),.57)):(t=a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP,s=a.engine.getGameAttribute(\"ItemDefinitionsGET\"),r=\"\"+h.string(a.engine.getGameAttribute(\"EquipmentOrder\")[1][1]),i=Math.max((5.7-(.2*Math.pow(c.asNumber(s.h[r].h.Speed),1.3)+(.9*Math.pow(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[3]),.5)/(Math.pow(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[3]),.5)+250)+.6*c.asNumber(a.engine.getGameAttribute(\"Lv0\")[3])/(c.asNumber(a.engine.getGameAttribute(\"Lv0\")[3])+40))))/(1+(q._customBlock_TotalFoodBonuses(\"ChoppinSpeedBoosts\")+(w._customBlock_CardBonusREAL(37)+(k._customBlock_GetTalentNumber(1,637)+(w._customBlock_EtcBonuses(\"61\")+Math.round(p._customBlock_MainframeBonus(112)/20)))))/100),.57)),t.h[e]=i,a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP.h[e];if(\"ChoppinEXPmulti\"==e)return t=a.engine.getGameAttribute(\"DNSM\").h.TotStatSkMAP,i=x._customBlock_SkillStats(\"AllSkillxpMULTI\")*(1+(k._customBlock_GetTalentNumber(1,464)+(k._custo"
      },
      "id": "cap-075"
    },
    {
      "world": "Account",
      "system": "Combat",
      "name": "Crystal spawn chance",
      "limit": "10% per roll",
      "note": "Natural crystal spawn chance is capped at 10%. Excess chance still feeds Crystal Embiggener, so going over this cap is not necessarily wasted.",
      "evidence": {
        "offset": 4019207,
        "expression": "CrystalSpawnCAP\"==e)return.1;if(\"CrystalEmbiggener\"==e)return Math.max(1,x._customBlock_ArbitraryCode(\"CrystalSpawn\")/x._customBlock_ArbitraryCode(\"CrystalSpawnCAP\"));if(\"GiantMob\"==e)return 5<p._customBlock_prayersReal(5,0)?5>c.asNumb"
      },
      "id": "cap-076"
    }
  ]
};
if(typeof module!=='undefined'&&module.exports)module.exports=data;else root.ShadowCapsData=data;
})(typeof window!=='undefined'?window:globalThis);
