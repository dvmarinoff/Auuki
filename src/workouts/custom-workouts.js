
// Add your custom workouts here as items in the array.
// Use the ZWO XML format inside template literals (backticks).

let customWorkouts = [
    `
<workout_file>
    <author>Oli</author>
    <name>My First Workout</name>
    <category>Potato</category>
    <subcategory></subcategory>
    <description>Best workout ever!</description>
    <sporttype>bike</sporttype>
    <tags></tags>
    <workout>
        <SteadyState Duration="300" Power="0.6" />
        <SteadyState Duration="600" Power="0.75" />
        <SteadyState Duration="120" Power="0.85" />
        <SteadyState Duration="60" Power="0.95" />
        <SteadyState Duration="120" Power="0.6" />
        <SteadyState Duration="120" Power="0.85" />
        <SteadyState Duration="60" Power="0.95" />
        <SteadyState Duration="120" Power="0.6" />
        <SteadyState Duration="120" Power="0.85" />
        <SteadyState Duration="60" Power="0.95" />
        <SteadyState Duration="120" Power="0.6" />
        <SteadyState Duration="120" Power="0.85" />
        <SteadyState Duration="60" Power="0.95" />
        <SteadyState Duration="120" Power="0.6" />
        <SteadyState Duration="180" Power="0.4" />
    </workout>
</workout_file>
    `
];

export { customWorkouts };
