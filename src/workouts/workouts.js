let workouts = [
        `<workout_file>
    <author>Marinov</author>
    <name>Dijon</name>
    <category>VO2 Max</category>
    <description>60/60s or 60 sec ON at 121% of FTP followed by 60 sec OFF. In 2 groups by 8 reps each.</description>
    <sportType>bike</sportType>
    <tags>
    </tags>
    <workout>
        <Warmup Duration="120" PowerLow="0.32" PowerHigh="0.39"/>
        <SteadyState Duration="60" Power="0.39"/>
        <SteadyState Duration="60" Power="0.47"/>
        <SteadyState Duration="60" Power="0.55"/>
        <SteadyState Duration="60" Power="0.63"/>
        <IntervalsT Repeat="2" OnDuration="30" OffDuration="30" OnPower="0.98" OffPower="0.63"/>
        <SteadyState Duration="120" Power="0.5"/>
        <IntervalsT Repeat="8" OnDuration="60" OffDuration="60" OnPower="1.21" OffPower="0.44"/>
        <SteadyState Duration="300" Power="0.40"/>
        <IntervalsT Repeat="8" OnDuration="60" OffDuration="60" OnPower="1.21" OffPower="0.44"/>
        <SteadyState Duration="300" Power="0.40"/>
        <Cooldown Duration="300" PowerLow="0.39" PowerHigh="0.32"/>
    </workout>
</workout_file>
`,
`<workout_file>
    <author>Marinov</author>
    <name>Chili Pepper</name>
    <category>VO2 Max</category>
    <description> NOTE: This is mixed mode workout with slope targets in the main interval groups. 40/20s or 40 sec ON at 121% of FTP followed by 20 sec OFF, in 2 groups by 10 reps each.</description>
    <sportType>bike</sportType>
    <tags>
    </tags>
    <workout>
        <Warmup Duration="120" PowerLow="0.32" PowerHigh="0.39"/>
        <SteadyState Duration="60" Power="0.39" Cadence="80"/>
        <SteadyState Duration="60" Power="0.47" Cadence="90"/>
        <SteadyState Duration="60" Power="0.55" Cadence="100"/>
        <SteadyState Duration="60" Power="0.63" Cadence="90"/>
        <IntervalsT Repeat="2" OnDuration="30" OffDuration="30" OnPower="0.98" OffPower="0.63" Cadence="100" CadenceResting="80"/>
        <SteadyState Duration="120" Power="0.5" Slope="1"/>
        <IntervalsT Repeat="10" OnDuration="40" OffDuration="20" OnPower="1.21" OffPower="0.44" OnSlope="4" OffSlope="0" Cadence="90" CadenceResting="80"/>
        <SteadyState Duration="300" Power="0.40" Slope="1"/>
        <IntervalsT Repeat="10" OnDuration="40" OffDuration="20" OnPower="1.21" OffPower="0.44" OnSlope="4" OffSlope="0"/>
        <SteadyState Duration="300" Power="0.40"/>
        <Cooldown Duration="300" PowerLow="0.39" PowerHigh="0.32" />
    </workout>
</workout_file>
`,
`<workout_file>
    <author>Marinov</author>
    <name>Chili Pepper +1</name>
    <category>VO2 Max</category>
    <description>Short but tough, this is the hardest workout ever. It\'s gonna burn!</description>
    <sportType>bike</sportType>
    <tags>
    </tags>
    <workout>
        <Warmup Duration="120" PowerLow="0.32" PowerHigh="0.39"/>
        <SteadyState Duration="60" Power="0.39"/>
        <SteadyState Duration="60" Power="0.47"/>
        <SteadyState Duration="60" Power="0.55"/>
        <SteadyState Duration="60" Power="0.63"/>
        <IntervalsT Repeat="2" OnDuration="30" OffDuration="30" OnPower="0.98" OffPower="0.63"/>
        <SteadyState Duration="120" Power="0.5"/>
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <FreeRide Duration="300" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="40" Power="1.31"/>
        <FreeRide Duration="20" />
        <SteadyState Duration="300" Power="0.39"/>
        <Cooldown Duration="300" PowerLow="0.39" PowerHigh="0.32"/>
    </workout>
</workout_file>
`,
`<workout_file>
    <author>Marinov</author>
    <name>Pasta</name>
    <category>Threshold</category>
    <description>A classic 2 times 20 min at almost FTP. Make sure you had some pasta before this session. You will need it!</description>
    <sportType>bike</sportType>
    <tags>
    </tags>
    <workout>
        <Warmup Duration="120" PowerLow="0.32" PowerHigh="0.39"/>
        <SteadyState Duration="60" Power="0.39"/>
        <SteadyState Duration="60" Power="0.47"/>
        <SteadyState Duration="60" Power="0.55"/>
        <SteadyState Duration="60" Power="0.63"/>
        <IntervalsT  Repeat="2" OnDuration="30" OffDuration="30" OnPower="1.06" OffPower="0.63"/>
        <SteadyState Duration="120" Power="0.5"/>
        <SteadyState Duration="1200" Power="0.98"/>
        <SteadyState Duration="600" Power="0.44"/>
        <SteadyState Duration="1200" Power="0.98"/>
        <SteadyState Duration="300" Power="0.44"/>
        <Cooldown Duration="300" PowerLow="0.44" PowerHigh="0.32"/>
    </workout>
</workout_file>`
,
`<workout_file>
    <author>Marinov</author>
    <name>Potato Chips</name>
    <category>Threshold</category>
    <description>5 by 5 min at 100% of FTP with 5 min recovery in-between. Perfect to get you accustomed to your first intensive sessions after a base block, or just that new FTP value.</description>
    <sportType>bike</sportType>
    <tags>
    </tags>
    <workout>
        <SteadyState Duration="300" Power="0.39"/>
        <SteadyState Duration="120" Power="0.60"/>
        <IntervalsT Repeat="2" OnDuration="30" OffDuration="30" OnPower="0.98" OffPower="0.5"/>
        <SteadyState Duration="120" Power="0.56"/>
        <IntervalsT Repeat="5" OnDuration="300" OffDuration="300" OnPower="1" OffPower="0.5"/>
        <SteadyState Duration="300" Power="0.39"/>
    </workout>
</workout_file>`
,
`<workout_file>
    <author>Marinov</author>
    <name>Maple</name>
    <category>Sweet Spot</category>
    <description>4 times 10 min sweet spot intervals with 5 min recovery in-between and warm-up ramp.</description>
    <sportType>bike</sportType>
    <tags>
        <tag name="sweet"/>
        <tag name="spot"/>
    </tags>
    <workout>
        <Warmup Duration="300" PowerLow="0.32" PowerHigh="0.75"/>
        <IntervalsT Repeat="2" OnDuration="30" OffDuration="30" OnPower="1.08" OffPower="0.44"/>
        <SteadyState Duration="180" Power="0.44"/>
        <IntervalsT Repeat="4" OnDuration="600" OffDuration="300" OnPower="0.92" OffPower="0.44"/>
        <Cooldown Duration="600" PowerLow="0.44" PowerHigh="0.32"/>
    </workout>
</workout_file>`
,
`<workout_file>
    <author>Marinov</author>
    <name>Honey</name>
    <category>Sweet Spot</category>
    <description>4 times 10 min sweet spot intervals with 5 min recovery in-between.</description>
    <sportType>bike</sportType>
    <workout>
        <Warmup Duration="300" PowerLow="0.32" PowerHigh="0.75"/>
        <IntervalsT Repeat="2" OnDuration="30" OffDuration="30" OnPower="1.08" OffPower="0.44"/>
        <SteadyState Duration="180" Power="0.44"/>
        <IntervalsT Repeat="3" OnDuration="900" OffDuration="300" OnPower="0.90" OffPower="0.44"/>
        <Cooldown Duration="600" PowerLow="0.44" PowerHigh="0.32"/>
    </workout>
</workout_file>`
,
`<workout_file>
    <author>Marinov</author>
    <name>Baguette</name>
    <category>Base</category>
    <description>The bread and butter of endurance training with efforts in Zone 1 and 2.</description>
    <sportType>bike</sportType>
    <tags>
    </tags>
    <workout>
        <Warmup Duration="600" PowerLow="0.32" PowerHigh="0.63"/>
        <SteadyState Duration="600" Power="0.63"/>
        <SteadyState Duration="300" Power="0.56"/>
        <SteadyState Duration="600" Power="0.71"/>
        <SteadyState Duration="300" Power="0.56"/>
        <SteadyState Duration="600" Power="0.71"/>
        <SteadyState Duration="300" Power="0.56"/>
        <SteadyState Duration="600" Power="0.71"/>
        <SteadyState Duration="300" Power="0.56"/>
        <SteadyState Duration="600" Power="0.63"/>
        <Cooldown Duration="600" PowerLow="0.63" PowerHigh="0.32"/>
    </workout>
</workout_file>`
,
`<workout_file>
    <author>Marinov</author>
    <name>Baguette +1</name>
    <category>Base</category>
    <description>The bread and butter of endurance training, with efforts in Zone 2.</description>
    <sportType>bike</sportType>
    <tags>
    </tags>
    <workout>
        <SteadyState Duration="600" Power="0.39"/>
        <SteadyState Duration="600" Power="0.63"/>
        <SteadyState Duration="300" Power="0.56"/>
        <SteadyState Duration="600" Power="0.67"/>
        <SteadyState Duration="300" Power="0.56"/>
        <SteadyState Duration="600" Power="0.71"/>
        <SteadyState Duration="300" Power="0.56"/>
        <SteadyState Duration="600" Power="0.71"/>
        <SteadyState Duration="300" Power="0.56"/>
        <SteadyState Duration="600" Power="0.71"/>
        <SteadyState Duration="300" Power="0.56"/>
        <SteadyState Duration="600" Power="0.67"/>
        <SteadyState Duration="300" Power="0.56"/>
        <SteadyState Duration="600" Power="0.63"/>
        <SteadyState Duration="600" Power="0.39"/>
    </workout>
</workout_file>`
,
`<workout_file>
    <author>Flux</author>
    <name>Salmon</name>
    <category>Base</category>
    <subcategory></subcategory>
    <description>The fat max workout to push your aerobic base up.</description>
    <sporttype>bike</sporttype>
    <tags></tags>
    <workout>
        <SteadyState Duration="600" Power="0.43" />
        <SteadyState Duration="600" Power="0.51" />
        <SteadyState Duration="600" Power="0.56" />
        <SteadyState Duration="600" Power="0.6" />
        <SteadyState Duration="2400" Power="0.63" />
        <SteadyState Duration="600" Power="0.43" />
    </workout>
</workout_file>`,
`<workout_file>
    <author>Flux</author>
    <name>Salmon +1</name>
    <category>Base</category>
    <subcategory></subcategory>
    <description>The fat max workout to push your aerobic base up.</description>
    <sporttype>bike</sporttype>
    <tags></tags>
    <workout>
        <SteadyState Duration="600" Power="0.43" />
        <SteadyState Duration="600" Power="0.51" />
        <SteadyState Duration="600" Power="0.56" />
        <SteadyState Duration="600" Power="0.6" />
        <SteadyState Duration="3600" Power="0.63" />
        <SteadyState Duration="600" Power="0.56" />
        <SteadyState Duration="600" Power="0.43" />
    </workout>
</workout_file>`,
`<workout_file>
    <author>Marinov</author>
    <name>Blackcurrant</name>
    <category>Recovery</category>
    <description>A recovery ride in zone 1 at 50% of FTP.</description>
    <sporttype>bike</sporttype>
    <tags></tags>
    <workout>
        <Warmup Duration="600" PowerLow="0.30" PowerHigh="0.5"/>
        <SteadyState Duration="2400" Power="0.5"/>
        <Cooldown Duration="600" PowerLow="0.5" PowerHigh="0.30"/>
    </workout>
</workout_file>`,
`<workout_file>
    <author>Flux</author>
    <name>5-1-5 Moxy Test</name>
    <category>Test</category>
    <subcategory></subcategory>
    <description>It's important to not warm-up before the test. You should not cycle during the rest intervals, since they are meant to track SmO2 and THb recovery rate. You are meant to fail in any of the last 3 steps. Use the Moxy Academy course for guidence on how to analyze. Muscle Oxygen Zone Assessment: https://moxy-academy.teachable.com/courses/209052/lectures/3480785.
</description>
    <sporttype>bike</sporttype>
    <tags></tags>
    <workout>
        <SteadyState Duration="300" Power="0.44" />
        <SteadyState Duration="60" Power="0" />
        <SteadyState Duration="300" Power="0.44" />
        <SteadyState Duration="60" Power="0" />
        <SteadyState Duration="300" Power="0.66" />
        <SteadyState Duration="60" Power="0" />
        <SteadyState Duration="300" Power="0.66" />
        <SteadyState Duration="60" Power="0" />
        <SteadyState Duration="300" Power="0.88" />
        <SteadyState Duration="60" Power="0" />
        <SteadyState Duration="300" Power="0.88" />
        <SteadyState Duration="60" Power="0" />
        <SteadyState Duration="300" Power="1.1" />
        <SteadyState Duration="60" Power="0" />
        <SteadyState Duration="300" Power="1.1" />
        <SteadyState Duration="60" Power="0" />
        <SteadyState Duration="300" Power="1.32" />
        <SteadyState Duration="60" Power="0" />
        <SteadyState Duration="300" Power="1.32" />
    </workout>
</workout_file>`,
`<workout_file>
    <author>Flux</author>
    <name>Ramp Test</name>
    <category>Ramp Test</category>
    <description>Ramp test proceeding in steps of 6% of previous FTP for 60 seconds. Do until exhaustion and take 75% of the power you did in the last interval you’ve reached. That's your new FTP.</description>
    <sportType>bike</sportType>
    <tags>
    </tags>
    <workout>
        <SteadyState Duration=" 300" Power="0.46" />
        <SteadyState Duration="60" Power="0.52" />
        <SteadyState Duration="60" Power="0.58" />
        <SteadyState Duration="60" Power="0.64" />
        <SteadyState Duration="60" Power="0.70" />
        <SteadyState Duration="60" Power="0.76" />
        <SteadyState Duration="60" Power="0.82" />
        <SteadyState Duration="60" Power="0.88" />
        <SteadyState Duration="60" Power="0.94" />
        <SteadyState Duration="60" Power="1.0" />
        <SteadyState Duration="60" Power="1.06" />
        <SteadyState Duration="60" Power="1.12" />
        <SteadyState Duration="60" Power="1.18" />
        <SteadyState Duration="60" Power="1.24" />
        <SteadyState Duration="60" Power="1.3" />
        <SteadyState Duration="60" Power="1.36" />
        <SteadyState Duration="60" Power="1.42" />
        <SteadyState Duration="60" Power="1.48" />
        <SteadyState Duration="60" Power="1.54" />
        <SteadyState Duration="60" Power="1.6" />
        <SteadyState Duration="60" Power="1.66" />
        <SteadyState Duration="60" Power="1.72" />
        <SteadyState Duration="60" Power="1.78" />
        <SteadyState Duration="60" Power="1.84" />
        <SteadyState Duration="60" Power="1.9" />
        <SteadyState Duration="60" Power="1.96" />
        <SteadyState Duration="60" Power="2.02" />
    </workout>
</workout_file>`,
];

export { workouts };
