styles in frontend are broken. Remove all css and tailwind from everything and style it from scratch. Reset tailwind classes and everything to default.
then add this to tailwind config -
"colors: {
'text': 'var(--text)',
'background': 'var(--background)',
'primary': 'var(--primary)',
'secondary': 'var(--secondary)',
'accent': 'var(--accent)',
},"
And add this to the .css file -
"@layer base {
:root {
--text: #120e1b;
--background: #f1ecf8;
--primary: #381a6b;
--secondary: #9d72ee;
--accent: #5607df;
}
.dark {
--text: #e8e4f1;
--background: #0c0713;
--primary: #b294e5;
--secondary: #3d118d;
--accent: #6f20f8;
}
},"
Then style everything from scratch. Use background for background color for website, use text for text, use primary for primary box color, secondary for secondary box color, accent for accent places, and never, ever, ever put the same color text on the same color background (NO MIXING OF PRIMARY-SECONDARY-ACCENT BACGKROUNDS AND TEXTS ARE ALLOWED AT ALL!)

ALSO PLEASE WRITE COMMON REUSABLE STYLED COMPONENTS, TO MAKE THE BUTTONS LOOK THE SAME WHEN THEY ARE THE SAME TYPE OF BUTTON, THE SMAE LISTS, THE SAME FIELDS, THE SAME MENUS ITEMS, TO REUSE GOOD STYLES WITHOUT NEEDING TO WRITE EVERYTHING MANY TIMES OVER.
