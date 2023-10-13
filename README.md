# Mochi Cards Pro

This is a lightweight obsidian plugin that allows me to create flashcards quickly with Mochi using the premium API it supplies. It will only work if you have Mochi pro.

__You must have Mochi Pro for this plugin to work and provide your API key in the plugin settings__.

The only Mochi Templates that work have to start in this format:
```
<< Name >> 
<input value="">
```
The part after that doesn't matter.

To export a card, write it in this format:
```
# Card Name
Card Content
```

Anything can be in the content. Markdown and LaTeX both work.
You can export multiple cards at a time. For example,

```
# What does Modus Ponens mean?
If a conditional statement is true and the hypothesis is true, the conclusion is therefore true.
$$\begin{array}{c} p \\ p \rightarrow q \\ \hline \therefore q \end{array}$$

# What is Dichotic Listening?
Each ear is a separate channel of information. It's much easier to only pay attention to one or the other. Broadbent has a Filter Model of Selective Attention that shows this limiting of channels.
![](https://upload.wikimedia.org/wikipedia/commons/2/23/Broadbent_Filter_Model.jpg)
There's a buffer where you can go back and recover what was heard in the other ear by thinking about it.
```

To export, simply select the cards you want to export, use CMD+P to open the command picker, and chose "Export Card from Text". Follow the prompts.

## Demo
![Demo](https://img.hayden.gg/7dee8e8af29674e3a05273917223354f.gif)
