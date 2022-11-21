'use strict';
const Librus = require("librus-api");
const ical = require('ical-generator');
const http = require('http');

const calendar = ical({name: process.env.CALENDAR_NAME ?? 'Kalendarz Librus'});
const listenAddress = '0.0.0.0'
const listenPort = 3000

http.createServer((req, res) => calendar.serve(res))
    .listen(listenPort, listenAddress, () => {
        console.log('Server running at http://' + listenAddress + ':' + listenPort + '/');
    });

let client = new Librus();

const timer = ms => new Promise(res => setTimeout(res, ms))

async function refreshingCalendarLoop() {
    while (true) {
        refreshCalendar();
        await timer(15 * 60 * 1000); // then the created Promise can be awaited
    }
}

refreshingCalendarLoop();

function refreshCalendar() {
    console.log(new Date(), "Refreshing calendar '" + calendar.name() + "'")
    calendar.clear();
    client.authorize(process.env.LIBRUS_USER, process.env.LIBRUS_PASSWORD).then(function () {
        processHomeworks();
        processCalendarEvents();
    }).catch(reason => console.log(reason));
}

function processHomeworks() {
    let from = new Date();
    from.setDate(1);
    let to = new Date();
    to.setDate(1);
    to.setMonth(from.getMonth() + 1);

    function getDatePart(date) {
        return date.toISOString().split('T')[0];
    }

    client.homework.listHomework(-1, getDatePart(from), getDatePart(to)).then(homeworks => {
        for (const data of homeworks) {
            client.homework.getHomework(data.id).then(homework => {
                createEvent(homework.to, homework.type + ", " + homework.title, homework.content)
            });
        }
    });
}

function processCalendarEvents() {
    client.calendar.getCalendar().then(data => {
        for (const events of data) {
            for (const event of events) {
                if (event.id > 0) {
                    client.calendar.getEvent(event.id).then(data => {
                        if (data === 0) {
                            return;
                        }
                        createEvent(data.date, data.lesson + ", " + data.type, data.description + " " + data.added);
                    });
                }
            }
        }
    });
}

function createEvent(date, summary, description) {
    const startTime = new Date(date);
    console.log(new Date(), "Adding event: " + summary);
    calendar.createEvent({
        start: startTime,
        allDay: true,
        summary: summary,
        description: description
    });
}

process.on('SIGINT', function () {
    console.log("Caught interrupt signal");
    process.exit();
});