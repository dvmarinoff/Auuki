<img alt="Auuki Indoor Cyling app for Structured Training" src="doc/images/github-project-header.png" />

# Auuki

Auuki is an App for executing structured workouts on a smart trainer.

- executing Zwift .zwo workouts
- riding .fit courses and activities
- works with bluetooth smart trainers, power meters and heart rate monitors.
- ERG mode and extended manual control of your trainer with Grade Simulation and Resistance mode.
- workouts with [Slope targets](https://github.com/dvmarinoff/Auuki/wiki/Slope-target-for-workout-intervals)
- recording .FIT Activities compatible with all major platforms like Strava, Training Peaks, etc
- build-in collection of structured workouts to get you started
- integrations with [Intervals.icu](https://intervals.icu/) and Strava allow for syncing planned workouts and uploading activities

The web version is free to use and open source. It is developed as a static PWA, has zero dependancies and is completly independant to run.
Everything happens in your Browser and stays in there. It uses Web Bluetooth, Web Serial, Web Components, IndexDB, Local Storage, WakeLock API.

_Status_: Currently working on creating a backend API and iOS app.

## Supported Browsers

**TL;DR:** Use Google Chrome on Android, Windows 10, Mac (M1 or Intel) and Ubuntu, but not iOS.

The Web version is running directly in the browser and relies on some of the latest web technologies. Browsers like Firefox and Safari don't have support for them. On iOS Safari is the only allowed browser, and even Chrome for iOS is just Safari with a Chrome skin. Browser support for the web version is the following:

| Chrome | Edge | Opera | Chrome Android | Samsung Internet | Firefox | Safari | Safari iOS | Chrome iOS |
|--------|------|-------|----------------|------------------|---------|--------|------------|------------|
| yes    | yes  | yes   | yes            | yes              | no      | no     | no         | no         |


### Linux
On Chrome, Edge and Opera for Linux you might need to turn on the experimental platforms feature flag at

- Chrome: `chrome://flags/#enable-experimental-web-platform-features`

- Edge: `edge://flags/#enable-experimental-web-platform-features`

- Opera: `opera://flags/#enable-experimental-web-platform-features`

### iOS
work is in progress to finnish the iOS, expect updates soon ...



## Supported Trainers

### FTMS, or FE-C over BLE

Works with all trainers that implement the bluetooth Fitness Machine Service (FTMS) or the Tacx FE-C over BLE solution.

The following table is copied from [DC Rainmaker Trainer Guide](https://www.dcrainmaker.com/2020/11/smart-cycle-trainer-recommendations-guide-winter.html/#technical-considerations) and shows current protocol support across the industry.

```
- Elite:    ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers.
- Gravat:   ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers
- JetBlack: ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers.
- Kinetic:  ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers.
- Minoura:  ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers.
- Saris:    ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers.
- STAC:     ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers.
- Tacx:     ANT+ FE-C on all ‘Smart’ branded trainers (except Satori). FTMS on all non-NEO models. FEC over BLE on NEO.
- Wahoo:    ANT+ FE-C on all smart trainers. FTMS on all 2020 smart trainer.
- 4iiii:    ANT+ FE-C and Bluetooth FTMS on Fliiiight (--Ed)
- Schwinn:  Bluetooth FTMS on the IC8 / 800IC (--Ed)
```

### ANT+

Support for ANT+ is experimental at the moment. It is being rewritten right now and the code is moved to [WebANT](https://github.com/dvmarinoff/WebANT), which has a separate demo. When it becomes stable enough will be merged here. It currently has support for Ubuntu(Linux), and partially for MacOS, and Android. Windows 10 may be possible in the future.


The current development setup is using Suunto movestick mini, Garmin Fenix 5 watch broadcasting heart rate,
Tacx Heart Rate monitor, Tacx Flux S trainer, and X240 laptop with Ubuntu 20.04.2 LTS, M1 Mac, and Samsung S9 Android phone.

## The Demo
You can check a pre-release demo of the web version at
[Latest Version on master](https://auuki.com)

Keep in mind it is in active development and will change and break on daily bases, that's until the first stable version is released.

## Manual

- [How-To: Using the connection settings](https://github.com/dvmarinoff/Auuki/discussions/91)
- [How-To: Using Auuki and another app concurrently](https://github.com/dvmarinoff/Auuki/discussions/101)

<!-- sponsors -->
## Sponsers 💖

While Auuki is free software and will always be, the project would benefit immensely from some funding. Raising a monthly budget we help cover the development and runnig costs for servers, databases, domains, storage, and others.

You can support the development of Auuki via [Github Sponsers](https://github.com/sponsors/dvmarinoff).

### Backers
<div>
    <a href="https://github.com/KlausMu" target="_blank">
        <img style="display: inline-block;" src="https://avatars.githubusercontent.com/u/14290221?v=4" width="48" height="48" />
    </a>
    <a href="https://github.com/TClin76" target="_blank">
        <img style="display: inline-block;" src="https://avatars.githubusercontent.com/u/96434118?v=4" width="48" height="48" />
    </a>
    <a href="https://github.com/fvolcic" target="_blank">
        <img style="display: inline-block;" src="https://avatars.githubusercontent.com/u/59806465?s=64&v=4" width="48" height="48" />
    </a>
    <a href="https://github.com/napfbike" target="_blank">
        <img style="display: inline-block;" src=https://avatars.githubusercontent.com/u/192727271?v=4"" width="48" height="48" />
    </a>
</div>
<!-- sponsors -->
