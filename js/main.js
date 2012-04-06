addEventListener('load', function() {

    // Set up the terminal
    new MockTerminal(document.getElementById('repl'), 80, 5, 500)
        .println(GayLisp.getMetadata().banner)
        .println(';; Type (tutorial) and press enter for an interactive tutorial.')
        .setPrompt('>> ')
        .pushInterpreter(function(string, terminal) {
            return GayLisp.repl(string, function(sideEffect) {
                terminal.println(sideEffect);
            });
        })
        .pushInterpreter(tutorial)
        .setInputCompleteHandler(GayLisp.willParse)
        .start();

    var startOn;
    switch (document.location.hash) {
        // No fragment: start at the REPL
        case '':
            startOn = '#repl';
            break;
        // Fragment corresponding to one of the rotary nav items: start at that item
        case '#repl':
        case '#spec':
        case '#about':
            startOn = document.location.hash;
            break;
        // Other fragment: it's inside the spec, start there.
        default:
            startOn = '#spec';
            break;
    }

    // Set up the layers on the page
    new VisibilityManager()
        .registerAnchors(document.querySelectorAll('.vis-manager'))
    .bringToFront(document.querySelector(startOn));

    // Set up the rotary-phone-like nav thing in the corner
    new RotaryNav(document.getElementById('logo'), 40, 60, -60)
        .setTransitionSpeed(0.5)
        .registerNodes(document.getElementById('navlist').children)
        .setSelectClass('selected')
        .rotateElementToFront(document.querySelector('a[href="' + startOn + '"]').parentElement);

    var h1s = document.querySelectorAll('section > h1');

    // Decorate the major headings with links back to the top
    for (var i = 0; i < h1s.length; ++i) {
        var a = document.createElement('a');
        a.href = '#contents';
        a.appendChild(document.createTextNode('⇧'));
        h1s[i].parentElement.insertBefore(a, h1s[i].nextElementSibling);
    }


    // Make the logo in the rotary nav thing change colors intermittently.
    var colors = [
        'rgba(255,0,0,0.8)', // red
        'rgba(0,0,0,0)',
        'rgba(255,165,0,0.8)', // orange
        'rgba(0,0,0,0)',
        'rgba(255,255,0,0.8)', // yellow
        'rgba(0,0,0,0)',
        'rgba(0,255,0,0.8)', // green
        'rgba(0,0,0,0)',
        'rgba(0,0,255,0.8)', // blue
        'rgba(0,0,0,0)',
        'rgba(75,0,130,0.8)', // indigo
        'rgba(0,0,0,0)',
        'rgba(238,130,238,0.8)', // violet
        'rgba(0,0,0,0)'];
    function changeColor(i) {
        document.getElementById('logo').style.backgroundColor = colors[i];
        setTimeout(changeColor, 10000, (i+1) % colors.length);
    }
    setTimeout(changeColor, 10000, 0);

    // Set the title of the spec attractively
    new TextResizer(document.getElementById('hero-top'));
    new TextResizer(document.getElementById('hero'));
    new TextResizer(document.getElementById('about-hero'));

    // Open Tweet in a popup, not a new tab/window.
    document.getElementById('tweet').addEventListener('click', function(e) {
       open(e.target.href, '_blank', 'width=550,height=450');
        e.preventDefault();
    });
});
