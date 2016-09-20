/// <reference path="../../typings/globals/jquery/index.d.ts" />
/// <reference path="../../typings/globals/jqueryui/index.d.ts" />
/// <reference path="../../typings/globals/moment/index.d.ts" />

"use strict";

var SchedUI = {
    Options: {
        /* The function to call to fill up Sections.
           Sections are cached. To clear cache, use TimelineScheduler.FillSections(true);
           Callback accepts an array of sections in the format {
            id: num,
            name: string
           }
        */
        GetSections: function (callback) {
        },
        /* The function to call to fill up Items.
           Callback accepts an array of items in the format
           {
                id: num,
                name: string,
                sectionID: ID of Section,
                start: Moment of the start,
                end: Moment of the end,
                classes: string of classes to add,
                events: [
                    {
                        label: string to show in tooltip,
                        at: Moment of event,
                        classes: string of classes to add
                    }
                ]
            }
        */
        GetSchedule: function (callback, start, end) {
        },
        /* The Moment to start the calendar at. RECOMMENDED: .startOf('day') */
        Start: moment(),
        /* The Moment format to use when displaying Header information */
        HeaderFormat: 'Do MMM YYYY',
        /* The Moment format to use when displaying Tooltip information */
        LowerFormat: 'DD-MMM-YYYY HH:mm',
        /* An array of Periods to be selectable by the user in the form of {
            Name: unique string name to be used when selecting,
            Label: string to display on the Period Button,
            TimeframePeriod: number of minutes between intervals on the scheduler,
            TimeframeOverall: number of minutes between the Start of the period and the End of the period,
            TimeframeHeaderFormats: Array of formats to use for headers.
        }
        */
        Periods: [{
                Name: '2 days',
                Label: '2 days',
                TimeframePeriod: 120,
                TimeframeOverall: 2880,
                TimeframeHeaders: ['Do MMM', 'HH'],
                Classes: 'time-sch-period-2day'
            }, {
                Name: '2 weeks',
                Label: '2 weeks',
                TimeframePeriod: 1440,
                TimeframeOverall: 20160,
                TimeframeHeaders: ['MMM', 'Do'],
                Classes: 'time-sch-period-2week'
            }],
        /* The Name of the period to select */
        SelectedPeriod: '2 weeks',
        /* The Element to put the scheduler on */
        Element: $('<div></div>'),
        /* The minimum height of each section */
        MinRowHeight: 40,
        /* Whether to show the Current Time or not */
        ShowCurrentTime: true,
        /* Whether to show the Goto button */
        ShowGoto: true,
        /* Whether to show the Today button */
        ShowToday: true,
        /* Text to use when creating the scheduler */
        Text: {
            NextButton: 'Next',
            NextButtonTitle: 'Next period',
            PrevButton: 'Prev',
            PrevButtonTitle: 'Previous period',
            TodayButton: 'Today',
            TodayButtonTitle: 'Go to today',
            GotoButton: 'Go to',
            GotoButtonTitle: 'Go to specific date'
        },
        Events: {
            // function (item) { }
            ItemMouseEnter: null,
            // function (item) { }
            ItemMouseLeave: null,
            // function (item) { }
            ItemClicked: null,
            // function (item, sectionID, start, end) { }
            ItemDropped: null,
            // function (item, start, end) { }
            ItemResized: null,
            // function (item, start, end) { }
            // Called when any item move event is triggered (draggable.drag, resizable.resize)
            ItemMovement: null,
            // Called when any item move event starts (draggable.start, resizable.start)
            ItemMovementStart: null,
            // Called when any item move event ends (draggable.end, resizable.end)
            ItemMovementEnd: null,
            // function (eventData, itemData)
            ItemEventClicked: null,
            // function (eventData, itemData)
            ItemEventMouseEnter: null,
            // function (eventData, itemData)
            ItemEventMouseLeave: null
        },
        // Should dragging be enabled?
        AllowDragging: false,
        // Should resizing be enabled?
        AllowResizing: false,
        // Disable items on moving?
        DisableOnMove: true,
        // A given max height for the calendar, if unspecified, will expand forever
        MaxHeight: null,
        AppendWeekDaysClasses: true
    },
    Wrapper: null,
    HeaderWrap: null,
    TableWrap: null,
    ContentHeaderWrap: null,
    ContentWrap: null,
    TableHeader: null,
    TableContent: null,
    SectionWrap: null,
    Table: null,
    Sections: {},
    CachedSectionResult: null,
    CachedScheduleResult: null,
    SetupPrototypes: function () {
        moment.fn["tsAdd"] = function (input, val) {
            var dur;
            // switch args to support add('s', 1) and add(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            }
            else {
                dur = moment.duration(input, val);
            }
            this.tsAddOrSubtractDurationFromMoment(this, dur, 1);
            return this;
        };
        moment.fn["tsSubtract"] = function (input, val) {
            var dur;
            // switch args to support subtract('s', 1) and subtract(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            }
            else {
                dur = moment.duration(input, val);
            }
            this.tsAddOrSubtractDurationFromMoment(this, dur, -1);
            return this;
        };
        // Replace the AddOrSubtract function so that zoning is not taken into account at all
        moment.fn["tsAddOrSubtractDurationFromMoment"] = function (mom, duration, isAdding) {
            var ms = duration._milliseconds, d = duration._days, M = duration._months, currentDate;
            if (ms) {
                mom.milliseconds(mom.milliseconds() + ms * isAdding);
            }
            if (d) {
                mom.date(mom.date() + d * isAdding);
            }
            if (M) {
                currentDate = mom.date();
                mom.date(1)
                    .month(mom.month() + M * isAdding)
                    .date(Math.min(currentDate, mom.daysInMonth()));
            }
        };
    },
    Override: null,
    /* Initializes the Timeline Scheduler with the given opts. If omitted, defaults are used. */
    /* This should be used to recreate the scheduler with new defaults or refill items */
    Init: function (overrideCache) {
        SchedUI.Override = overrideCache || SchedUI.Override;
        var hashObj = SchedUI.GetUrlHash();
        SchedUI.SetupPrototypes();
        //SchedUI.Options.Start = moment(SchedUI.Options.Start);
        
        SchedUI.Options.Start = moment(hashObj["start"] || SchedUI.Options.Start || moment().startOf('day'));
        SchedUI.Options.SelectedPeriod = hashObj["period"] || SchedUI.Options.SelectedPeriod;

        SchedUI.Options.Element.find('.ui-draggable').draggable('destroy');
        SchedUI.Options.Element.empty();
        SchedUI.Wrapper = $(document.createElement('div'))
            .addClass('time-sch-wrapper')
            .appendTo(SchedUI.Options.Element);
        SchedUI.HeaderWrap = $(document.createElement('div'))
            .addClass('time-sch-header-wrapper time-sch-clearfix')
            .appendTo(SchedUI.Wrapper);
        SchedUI.TableWrap = $(document.createElement('div'))
            .addClass('time-sch-table-wrapper')
            .appendTo(SchedUI.Wrapper);
        SchedUI.CreateCalendar();
        SchedUI.FillSections(overrideCache);
    },
    Reload: function (overrideCache) {
        if (typeof SchedUI.Options.GetSections === "function") {
            SchedUI.Init(overrideCache);
            SchedUI.Options.GetSections(function(sections) {
                SchedUI.CachedSectionResult = sections;
                // SchedUI.FillSections_Callback(sections);
                // $(".time-sch-section-row, .time-sch-section-container").remove();
                SchedUI.Init(overrideCache);
            });
        } else {
            SchedUI.Init(overrideCache);
        }
    },
    SetUrlHash: function(key, value) {
        var hashArr = [];
        var hashObj = SchedUI.GetUrlHash();

        hashObj[decodeURIComponent(key)] = decodeURIComponent(value);
        for (var prop in hashObj) {
            if (hashObj.hasOwnProperty(prop)) {
                hashArr.push(encodeURIComponent(prop) + "=" + encodeURIComponent(hashObj[prop]));
            }
        }
        window.location.hash = "#" + hashArr.join("&");
    },
    GetUrlHash: function() {
        var hash = window.location.hash;
        var hashObj = {};
        hash = hash.replace("#", "");
        if (hash.length > 0) {
            hash.split("&").forEach(function(d) {
                var pair = d.split("=");
                hashObj[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            });
        }
        return hashObj;
    },
    GetSelectedPeriod: function () {
        var period;
        for (var i = 0; i < SchedUI.Options.Periods.length; i++) {
            if (SchedUI.Options.Periods[i].Name === SchedUI.Options.SelectedPeriod) {
                period = SchedUI.Options.Periods[i];
                break;
            }
        }
        if (!period) {
            period = SchedUI.Options.Periods[0];
            SchedUI.SelectPeriod(period.Name);
        }
        return period;
    },
    GetEndOfPeriod: function (start, period) {
        return moment(start)["tsAdd"]('minutes', period.TimeframeOverall);
    },
    AddHeaderClasses: function (td, columnCount, specificHeader) {
        var trs, trArray, tr;
        var tdArray, foundTD;
        var prevIndex, nextIndex, colspan;
        var complete, isEven;
        trs = SchedUI.TableHeader.find('tr');
        if (specificHeader !== undefined) {
            trs = $(trs.get(specificHeader));
        }
        if (trs.length && trs.length > 0) {
            trArray = $.makeArray(trs);
            for (var trCount = 0; trCount < trArray.length; trCount++) {
                complete = false;
                nextIndex = 0;
                tr = $(trArray[trCount]);
                tdArray = $.makeArray(tr.find('.time-sch-date-header'));
                for (var tdCount = 0; tdCount < tdArray.length && !complete; tdCount++) {
                    foundTD = $(tdArray[tdCount]);
                    colspan = Number(foundTD.attr('colspan'));
                    if (colspan && !isNaN(colspan) && colspan > 0) {
                        prevIndex = (nextIndex ? nextIndex : 0);
                        nextIndex = prevIndex + colspan;
                    } else {
                        prevIndex = (nextIndex ? nextIndex : 0);
                        nextIndex = prevIndex + 1;
                    }
                    if (prevIndex === columnCount) {
                        td.addClass('time-sch-header-' + trCount + '-date-start');
                    }
                    if (nextIndex - 1 === columnCount) {
                        td.addClass('time-sch-header-' + trCount + '-date-end');
                    }
                    if (prevIndex <= columnCount && columnCount < nextIndex) {
                        complete = true;
                        isEven = tdCount % 2 === 0;
                        td.addClass('time-sch-header-' + trCount + '-date-column-' + tdCount)
                            .addClass('time-sch-header-' + trCount + '-date-' + (isEven ? 'even' : 'odd'));
                        if (foundTD.hasClass('time-sch-header-' + trCount + '-current-time')) {
                            td.addClass('time-sch-header-' + trCount + '-current-time');
                        }
                    }
                }
            }
        }
    },
    CreateCalendar: function () {
        var tr, td, header;
        var minuteDiff, splits, period, end;
        var thisTime, prevDate, fThisTime, fPrevDate, colspan;
        var currentTimeIndex;
        colspan = 0;
        period = SchedUI.GetSelectedPeriod();
        end = SchedUI.GetEndOfPeriod(SchedUI.Options.Start, period);
        minuteDiff = Math.abs(SchedUI.Options.Start.diff(end, 'minutes'));
        splits = (minuteDiff / period.TimeframePeriod);
        SchedUI.ContentHeaderWrap = $(document.createElement('div'))
            .addClass('time-sch-content-header-wrap')
            .appendTo(SchedUI.TableWrap);
        SchedUI.ContentWrap = $(document.createElement('div'))
            .addClass('time-sch-content-wrap')
            .appendTo(SchedUI.TableWrap);
        SchedUI.TableHeader = $(document.createElement('table'))
            .addClass('time-sch-table time-sch-table-header')
            .appendTo(SchedUI.ContentHeaderWrap);
        SchedUI.TableContent = $(document.createElement('table'))
            .addClass('time-sch-table time-sch-table-content')
            .appendTo(SchedUI.ContentWrap);
        SchedUI.SectionWrap = $(document.createElement('div'))
            .addClass('time-sch-section-wrapper')
            .appendTo(SchedUI.ContentWrap);
        if (period.Classes) {
            SchedUI.TableWrap.toggleClass(period.Classes, true);
        }
        for (var headerCount = 0; headerCount < period.TimeframeHeaders.length; headerCount++) {
            prevDate = null;
            fPrevDate = null;
            var isEven = true;
            colspan = 0;
            currentTimeIndex = 0;
            header = period.TimeframeHeaders[headerCount];

            tr = $(document.createElement('tr'))
                .addClass('time-sch-times time-sch-times-header-' + headerCount)
                .appendTo(SchedUI.TableHeader);
            td = $(document.createElement('td'))
                .addClass('time-sch-section time-sch-section-header')
                .appendTo(tr);

            for (var i = 0; i < splits; i++) {
                thisTime = moment(SchedUI.Options.Start)["tsAdd"]('minutes', (i * period.TimeframePeriod));

                // console.log(thisTime.day());

                fThisTime = thisTime.format(header);
                if (fPrevDate !== fThisTime) {
                    // If there is no prevDate, it's the Section Header
                    if (prevDate) {
                        td.attr('colspan', colspan);
                        colspan = 0;
                        if (moment() >= prevDate && moment() < thisTime) {
                            td.addClass('time-sch-header-' + headerCount + '-current-time');
                        }
                    }
                    prevDate = thisTime;
                    fPrevDate = fThisTime;

                    td = $(document.createElement('td'))
                        .data('header-row', headerCount)
                        .data('column-count', i)
                        .data('column-is-even', isEven)
                        .addClass('time-sch-date time-sch-date-header')
                        .append(fThisTime)
                        .appendTo(tr);

                    td.addClass('time-sch-header-' + headerCount + '-date-start')
                        .addClass('time-sch-header-' + headerCount + '-date-end')
                        .addClass('time-sch-header-' + headerCount + '-date-column-' + currentTimeIndex)
                        .addClass('time-sch-header-' + headerCount + '-date-' + ((currentTimeIndex % 2 === 0) ? 'even' : 'odd'));

                    if (SchedUI.Options.AppendWeekDaysClasses) {
                        if (period.TimeframePeriod <= 1440) {
                            if (headerCount > 0) {
                                td.addClass('week-day-' + thisTime.day());
                            }
                        }
                    }

                    for (var prevHeader = 0; prevHeader < headerCount; prevHeader++) {
                        SchedUI.AddHeaderClasses(td, i, prevHeader);
                    }
                    currentTimeIndex += 1;
                }
                colspan += 1;
            }
            td.attr('colspan', colspan);
        }
        SchedUI.FillHeader();
    },
    CreateSections: function (sections) {
        var timeCount, tr, td, sectionContainer, headers, i;
        timeCount = 1;
        headers = $.makeArray(SchedUI.TableHeader.find('tr'));
        for (i = 0; i < headers.length; i++) {
            if (timeCount < $(headers[i]).find('.time-sch-date-header').length) {
                timeCount = $(headers[i]).find('.time-sch-date-header').length;
            }
        }
        for (i = 0; i < sections.length; i++) {
            tr = $(document.createElement('tr'))
                .addClass('time-sch-section-row')
                .addClass(i % 2 === 0 ? 'time-sch-section-even' : 'time-sch-section-odd')
                .css('height', SchedUI.Options.MinRowHeight)
                .appendTo(SchedUI.TableContent);
            sectionContainer = $(document.createElement('div'))
                .addClass('time-sch-section-container')
                .css('height', SchedUI.Options.MinRowHeight)
                .data('section', sections[i])
                .appendTo(SchedUI.SectionWrap);
            td = $(document.createElement('td'))
                .addClass('time-sch-section time-sch-section-content')
                .data('section', sections[i])
                .append(sections[i].name)
                .appendTo(tr);
            for (var time = 0; time < timeCount; time++) {
                td = $(document.createElement('td'))
                    .addClass('time-sch-date time-sch-date-content')
                    .appendTo(tr);

                SchedUI.AddHeaderClasses(td, time, null);
            }
            SchedUI.Sections[sections[i].id] = {
                row: tr,
                container: sectionContainer
            };

            // Fill in weekends
            if (SchedUI.Options.AppendWeekDaysClasses) {
                $(".time-sch-content-header-wrap > table tr.time-sch-times-header-1 > td").each(function(i, d) {
                    var tdClass = $(d).attr("class");
                    var weekDayIndx = tdClass.indexOf("week-day-");
                    if (weekDayIndx !== -1) {
                        $(".time-sch-content-wrap > table tr > td:nth-child(" + (i+1) + ")").addClass(tdClass.substring(weekDayIndx, weekDayIndx + 10));
                    }
                });
            }
            // Fill in weekends
        }
        SchedUI.SectionWrap.css({
            left: SchedUI.Options.Element.find('.time-sch-section').outerWidth()
        });
        if (SchedUI.Options.ShowCurrentTime) {
            SchedUI.ShowCurrentTime();
        }
    },
    ShowCurrentTimeHandle: null,
    ShowCurrentTime: function () {
        var currentTime, currentTimeElem, minuteDiff, currentDiff, end;
        // Stop any other timeouts happening
        if (SchedUI.ShowCurrentTimeHandle) {
            clearTimeout(SchedUI.ShowCurrentTimeHandle);
        }
        currentTime = moment();
        end = SchedUI.GetEndOfPeriod(SchedUI.Options.Start, SchedUI.GetSelectedPeriod());
        minuteDiff = Math.abs(SchedUI.Options.Start.diff(end, 'minutes'));
        currentDiff = Math.abs(SchedUI.Options.Start.diff(currentTime, 'minutes'));
        currentTimeElem = SchedUI.Options.Element.find('.time-sch-current-time');
        currentTimeElem.remove();
        if (currentTime >= SchedUI.Options.Start && currentTime <= end) {
            currentTimeElem = $(document.createElement('div'))
                .addClass('time-sch-current-time')
                .css('left', ((currentDiff / minuteDiff) * 100) + '%')
                .attr('title', currentTime.format(SchedUI.Options.LowerFormat))
                .appendTo(SchedUI.SectionWrap);
        }
        // Since we're only comparing minutes, we may as well only check once every 30 seconds
        SchedUI.ShowCurrentTimeHandle = setTimeout(SchedUI.ShowCurrentTime, 30000);
    },
    CreateItems: function (items) {
        var item, event, section, itemElem, eventElem, itemContent, itemName, itemIcon;
        var minuteDiff, splits, itemDiff, itemSelfDiff, eventDiff, calcTop, calcLeft, calcWidth, foundStart, foundEnd;
        var inSection = {}, foundPos, elem, prevElem, needsNewRow;
        var period, end, i;
        period = SchedUI.GetSelectedPeriod();
        end = SchedUI.GetEndOfPeriod(SchedUI.Options.Start, period);
        minuteDiff = Math.abs(SchedUI.Options.Start.diff(end, 'minutes'));
        for (i = 0; i < items.length; i++) {
            item = items[i];
            section = SchedUI.Sections[item.sectionID];
            if (section) {
                if (!inSection[item.sectionID]) {
                    inSection[item.sectionID] = [];
                }
                if (item.start <= end && item.end >= SchedUI.Options.Start) {
                    foundPos = null;
                    var schedStart = SchedUI.Options.Start.milliseconds();
                    foundStart = moment(Math.max(item.start, schedStart));
                    foundEnd = moment(Math.min(item.end, end));
                    itemDiff = foundStart.diff(SchedUI.Options.Start, 'minutes');
                    itemSelfDiff = Math.abs(foundStart.diff(foundEnd, 'minutes'));
                    calcTop = 0;
                    calcLeft = (itemDiff / minuteDiff) * 100;
                    calcWidth = (itemSelfDiff / minuteDiff) * 100;
                    itemElem = $(document.createElement('div'))
                        .addClass('time-sch-item ' + (item.classes ? item.classes : ''))
                        .css({
                            top: calcTop,
                            left: calcLeft + '%',
                            width: calcWidth + '%'
                        })
                        .appendTo(section.container);
                    itemContent = $(document.createElement('div'))
                        .addClass('time-sch-item-content')
                        .appendTo(itemElem);
                    if (item.name) {
                        $(document.createElement('div'))
                            .append(item.name)
                            .appendTo(itemContent);
                    }
                    if (item.events) {
                        for (var ev = 0; ev < item.events.length; ev++) {
                            event = item.events[ev];
                            eventDiff = (event.at.diff(foundStart, 'minutes') / itemSelfDiff) * 100;
                            $(document.createElement('div'))
                                .addClass('time-sch-item-event ' + (event.classes ? event.classes : ''))
                                .css('left', eventDiff + '%')
                                .attr('title', event.at.format(SchedUI.Options.LowerFormat) + ' - ' + event.label)
                                .data('event', event)
                                .appendTo(itemContent);
                        }
                    }
                    if (item.start >= SchedUI.Options.Start) {
                        $(document.createElement('div'))
                            .addClass('time-sch-item-start')
                            .appendTo(itemContent);
                    }
                    if (item.end <= end) {
                        $(document.createElement('div'))
                            .addClass('time-sch-item-end')
                            .appendTo(itemContent);
                    }
                    item.Element = itemElem;
                    // Place this in the current section array in its sorted position
                    for (var pos = 0; pos < inSection[item.sectionID].length; pos++) {
                        if (inSection[item.sectionID][pos].start > item.start) {
                            foundPos = pos;
                            break;
                        }
                    }
                    if (foundPos === null) {
                        foundPos = inSection[item.sectionID].length;
                    }
                    inSection[item.sectionID].splice(foundPos, 0, item);
                    itemElem.data('item', item);
                    SchedUI.SetupItemEvents(itemElem);
                }
            }
        }
        // Sort out layout issues so no elements overlap
        for (var prop in inSection) {
            section = SchedUI.Sections[prop];
            for (i = 0; i < inSection[prop].length; i++) {
                var elemTop, elemBottom;
                elem = inSection[prop][i];
                // If we're passed the first item in the row
                for (var prev = 0; prev < i; prev++) {
                    var prevElemTop, prevElemBottom;
                    prevElem = inSection[prop][prev];
                    prevElemTop = prevElem.Element.position().top;
                    prevElemBottom = prevElemTop + prevElem.Element.outerHeight();
                    elemTop = elem.Element.position().top;
                    elemBottom = elemTop + elem.Element.outerHeight();
                    // (elem.start must be between prevElem.start and prevElem.end OR
                    //  elem.end must be between prevElem.start and prevElem.end) AND
                    // (elem.top must be between prevElem.top and prevElem.bottom OR
                    //  elem.bottom must be between prevElem.top and prevElem.bottom)
                    needsNewRow =
                        ((prevElem.start <= elem.start && elem.start <= prevElem.end) ||
                            (prevElem.start <= elem.end && elem.end <= prevElem.end)) && ((prevElemTop <= elemTop && elemTop <= prevElemBottom) ||
                            (prevElemTop <= elemBottom && elemBottom <= prevElemBottom));
                    if (needsNewRow) {
                        elem.Element.css('top', prevElemBottom + 1);
                    }
                }
                elemBottom = elem.Element.position().top + elem.Element.outerHeight() + 1;
                if (elemBottom > section.container.height()) {
                    section.container.css('height', elemBottom);
                    section.row.css('height', elemBottom);
                }
            }
        }
    },
    SetupItemEvents: function (itemElem) {
        if (SchedUI.Options.Events.ItemClicked) {
            itemElem.click(function (event) {
                event.preventDefault();
                SchedUI.Options.Events.ItemClicked.call(this, $(this).data('item'));
            });
        }
        if (SchedUI.Options.Events.ItemMouseEnter) {
            itemElem.mouseenter(function (event) {
                SchedUI.Options.Events.ItemMouseEnter.call(this, $(this).data('item'));
            });
        }
        if (SchedUI.Options.Events.ItemMouseLeave) {
            itemElem.mouseleave(function (event) {
                SchedUI.Options.Events.ItemMouseLeave.call(this, $(this).data('item'));
            });
        }
        if (SchedUI.Options.AllowDragging) {
            itemElem.draggable({
                helper: 'clone',
                zIndex: 1,
                appendTo: SchedUI.SectionWrap,
                distance: 5,
                snap: '.time-sch-section-container',
                snapMode: 'inner',
                snapTolerance: 10,
                drag: function (event, ui) {
                    var item, start, end;
                    var period, periodEnd, minuteDiff;
                    if (SchedUI.Options.Events.ItemMovement) {
                        period = SchedUI.GetSelectedPeriod();
                        periodEnd = SchedUI.GetEndOfPeriod(SchedUI.Options.Start, period);
                        minuteDiff = Math.abs(SchedUI.Options.Start.diff(periodEnd, 'minutes'));
                        item = $(event.target).data('item');
                        start = moment(SchedUI.Options.Start)["tsAdd"]('minutes', minuteDiff * (ui.helper.position().left / SchedUI.SectionWrap.width()));
                        end = moment(start)["tsAdd"]('minutes', Math.abs(item.start.diff(item.end, 'minutes')));
                        // If the start is before the start of our calendar, add the offset
                        if (item.start < SchedUI.Options.Start) {
                            start.tsAdd('minutes', item.start.diff(SchedUI.Options.Start, 'minutes'));
                            end.tsAdd('minutes', item.start.diff(SchedUI.Options.Start, 'minutes'));
                        }
                        SchedUI.Options.Events.ItemMovement.call(this, item, start, end);
                    }
                },
                start: function (event, ui) {
                    $(this).hide();
                    // We only want content to show, not events or resizers
                    ui.helper.children().not('.time-sch-item-content').remove();
                    if (SchedUI.Options.Events.ItemMovementStart) {
                        SchedUI.Options.Events.ItemMovementStart.call(this);
                    }
                },
                stop: function (event, ui) {
                    if ($(this).length) {
                        $(this).show();
                    }
                    if (SchedUI.Options.Events.ItemMovementEnd) {
                        SchedUI.Options.Events.ItemMovementEnd.call(this);
                    }
                },
                cancel: '.time-sch-item-end, .time-sch-item-start, .time-sch-item-event'
            });
            $('.time-sch-section-container').droppable({
                greedy: true,
                hoverClass: 'time-sch-droppable-hover',
                tolerance: 'pointer',
                drop: function (event, ui) {
                    var item, sectionID, start, end;
                    var period, periodEnd, minuteDiff;
                    period = SchedUI.GetSelectedPeriod();
                    periodEnd = SchedUI.GetEndOfPeriod(SchedUI.Options.Start, period);
                    minuteDiff = Math.abs(SchedUI.Options.Start.diff(periodEnd, 'minutes'));
                    item = ui.draggable.data('item');
                    sectionID = $(this).data('section').id;
                    start = moment(SchedUI.Options.Start)["tsAdd"]('minutes', minuteDiff * (ui.helper.position().left / $(this).width()));
                    end = moment(start)["tsAdd"]('minutes', Math.abs(item.start.diff(item.end, 'minutes')));
                    // If the start is before the start of our calendar, add the offset
                    if (item.start < SchedUI.Options.Start) {
                        start.tsAdd('minutes', item.start.diff(SchedUI.Options.Start, 'minutes'));
                        end.tsAdd('minutes', item.start.diff(SchedUI.Options.Start, 'minutes'));
                    }
                    // Append original to this section and reposition it while we wait
                    ui.draggable.appendTo($(this));
                    ui.draggable.css({
                        left: ui.helper.position().left - $(this).position().left,
                        top: ui.helper.position().top - $(this).position().top
                    });
                    if (SchedUI.Options.DisableOnMove) {
                        if (ui.draggable.data('uiDraggable')) {
                            ui.draggable.draggable('disable');
                        }
                        if (ui.draggable.data('uiResizable')) {
                            ui.draggable.resizable('disable');
                        }
                    }
                    ui.draggable.show();
                    if (SchedUI.Options.Events.ItemDropped) {
                        // Time for a hack, JQueryUI throws an error if the draggable is removed in a drop
                        setTimeout(function () {
                            SchedUI.Options.Events.ItemDropped.call(this, item, sectionID, start, end);
                        }, 0);
                    }
                }
            });
        }
        if (SchedUI.Options.AllowResizing) {
            var foundHandles = null;
            if (itemElem.find('.time-sch-item-start').length && itemElem.find('.time-sch-item-end').length) {
                foundHandles = 'e, w';
            }
            else if (itemElem.find('.time-sch-item-start').length) {
                foundHandles = 'w';
            }
            else if (itemElem.find('.time-sch-item-end').length) {
                foundHandles = 'e';
            }
            if (foundHandles) {
                itemElem.resizable({
                    handles: foundHandles,
                    resize: function (event, ui) {
                        var item, start, end;
                        var period, periodEnd, minuteDiff;
                        if (SchedUI.Options.Events.ItemMovement) {
                            period = SchedUI.GetSelectedPeriod();
                            periodEnd = SchedUI.GetEndOfPeriod(SchedUI.Options.Start, period);
                            minuteDiff = Math.abs(SchedUI.Options.Start.diff(periodEnd, 'minutes'));
                            item = $(this).data('item');
                            if (ui.position.left !== ui.originalPosition.left) {
                                // Left handle moved
                                start = moment(SchedUI.Options.Start)["tsAdd"]('minutes', minuteDiff * ($(this).position().left / SchedUI.SectionWrap.width()));
                                end = item.end;
                            }
                            else {
                                // Right handle moved
                                start = item.start;
                                end = moment(SchedUI.Options.Start)["tsAdd"]('minutes', minuteDiff * (($(this).position().left + $(this).width()) / SchedUI.SectionWrap.width()));
                            }
                            SchedUI.Options.Events.ItemMovement.call(this, item, start, end);
                        }
                    },
                    start: function (event, ui) {
                        // We don't want any events to show
                        $(this).find('.time-sch-item-event').hide();
                        if (SchedUI.Options.Events.ItemMovementStart) {
                            SchedUI.Options.Events.ItemMovementStart.call(this);
                        }
                    },
                    stop: function (event, ui) {
                        var item, start, end;
                        var period, periodEnd, minuteDiff, section;
                        var $this;
                        $this = $(this);
                        period = SchedUI.GetSelectedPeriod();
                        periodEnd = SchedUI.GetEndOfPeriod(SchedUI.Options.Start, period);
                        minuteDiff = Math.abs(SchedUI.Options.Start.diff(periodEnd, 'minutes'));
                        item = $this.data('item');
                        if (ui.position.left !== ui.originalPosition.left) {
                            // Left handle moved
                            start = moment(SchedUI.Options.Start)["tsAdd"]('minutes', minuteDiff * ($this.position().left / SchedUI.SectionWrap.width()));
                            end = item.end;
                        }
                        else {
                            // Right handle moved
                            start = item.start;
                            end = moment(SchedUI.Options.Start)["tsAdd"]('minutes', minuteDiff * (($this.position().left + $this.width()) / SchedUI.SectionWrap.width()));
                        }
                        if (SchedUI.Options.DisableOnMove) {
                            if ($this.data('uiDraggable')) {
                                $this.draggable('disable');
                            }
                            if ($this.data('uiResizable')) {
                                $this.resizable('disable');
                            }
                            $this.find('.time-sch-item-event').show();
                        }
                        if (SchedUI.Options.Events.ItemMovementEnd) {
                            SchedUI.Options.Events.ItemMovementEnd.call(this);
                        }
                        if (SchedUI.Options.Events.ItemResized) {
                            SchedUI.Options.Events.ItemResized.call(this, item, start, end);
                        }
                    }
                });
            }
        }
        if (SchedUI.Options.Events.ItemEventClicked) {
            itemElem.find('.time-sch-item-event').click(function (event) {
                var itemElem = $(this).closest('.time-sch-item');
                event.preventDefault();
                SchedUI.Options.Events.ItemEventClicked.call(this, $(this).data('event'), itemElem.data('item'));
            });
        }
        if (SchedUI.Options.Events.ItemEventMouseEnter) {
            itemElem.find('.time-sch-item-event').mouseenter(function (event) {
                var itemElem = $(this).closest('.time-sch-item');
                event.preventDefault();
                // SchedUI.Options.Events.ItemEventClicked.call(this, $(this).data('event'), itemElem.data('item'));
                SchedUI.Options.Events.ItemEventMouseEnter.call(this, $(this).data('event'), itemElem.data('item'));
            });
        }
        if (SchedUI.Options.Events.ItemEventMouseLeave) {
            itemElem.find('.time-sch-item-event').mouseleave(function (event) {
                var itemElem = $(this).closest('.time-sch-item');
                event.preventDefault();
                // SchedUI.Options.Events.ItemEventClicked.call(this, $(this).data('event'), itemElem.data('item'));
                SchedUI.Options.Events.ItemEventMouseLeave.call(this, $(this).data('event'), itemElem.data('item'));
            });
        }
    },
    /* Call this with "true" as override, and sections will be reloaded. Otherwise, cached sections will be used */
    FillSections: function (override) {
        if (!SchedUI.CachedSectionResult || override) {
            SchedUI.Options.GetSections.call(this, SchedUI.FillSections_Callback);
        }
        else {
            SchedUI.FillSections_Callback(SchedUI.CachedSectionResult);
        }
    },
    FillSections_Callback: function (obj) {
        SchedUI.CachedSectionResult = obj;
        SchedUI.CreateSections(obj);
        SchedUI.FillSchedule();
    },
    FillSchedule: function () {
        var period, end;
        period = SchedUI.GetSelectedPeriod();
        end = SchedUI.GetEndOfPeriod(SchedUI.Options.Start, period);
        SchedUI.Options.GetSchedule.call(this, SchedUI.FillSchedule_Callback, SchedUI.Options.Start, end);
    },
    FillSchedule_Callback: function (obj) {
        SchedUI.CachedScheduleResult = obj;
        SchedUI.CreateItems(obj);
        
        // Fix rows height
        $(".time-sch-content-wrap > table > tbody > tr").each(function(i, d) {
            $("div.time-sch-section-wrapper > div.time-sch-section-container:nth-child(" + (i + 1) + ")").attr("style", "height:" + $(d).height() + "px;");
        });
        // Fix rows height
    },
    FillHeader: function () {
        var durationString, title, periodContainer, timeContainer, periodButton, timeButton;
        var selectedPeriod, end, period;
        periodContainer = $(document.createElement('div'))
            .addClass('time-sch-period-container');
        timeContainer = $(document.createElement('div'))
            .addClass('time-sch-time-container');
        title = $(document.createElement('div'))
            .addClass('time-sch-title');
        SchedUI.HeaderWrap
            .empty()
            .append(periodContainer, timeContainer, title);
        selectedPeriod = SchedUI.GetSelectedPeriod();
        end = SchedUI.GetEndOfPeriod(SchedUI.Options.Start, selectedPeriod);
        // Header needs a title
        // We take away 1 minute 
        title.text(SchedUI.Options.Start.format(SchedUI.Options.HeaderFormat) + ' - ' + end.tsAdd('minutes', -1).format(SchedUI.Options.HeaderFormat));
        for (var i = 0; i < SchedUI.Options.Periods.length; i++) {
            period = SchedUI.Options.Periods[i];
            $(document.createElement('a'))
                .addClass('time-sch-period-button time-sch-button')
                .addClass(period.Name === selectedPeriod.Name ? 'time-sch-selected-button' : '')
                .attr('href', '#')
                .append(period.Label)
                .data('period', period)
                .click(SchedUI.Period_Clicked)
                .appendTo(periodContainer);
        }
        if (SchedUI.Options.ShowGoto) {
            $(document.createElement('a'))
                .addClass('time-sch-time-button time-sch-time-button-goto time-sch-button')
                .attr({
                href: '#',
                title: SchedUI.Options.Text.GotoButtonTitle
            })
                .append(SchedUI.Options.Text.GotoButton)
                .click(SchedUI.GotoTimeShift_Clicked)
                .appendTo(timeContainer);
        }
        if (SchedUI.Options.ShowToday) {
            $(document.createElement('a'))
                .addClass('time-sch-time-button time-sch-time-button-today time-sch-button')
                .attr({
                href: '#',
                title: SchedUI.Options.Text.TodayButtonTitle
            })
                .append(SchedUI.Options.Text.TodayButton)
                .click(SchedUI.TimeShift_Clicked)
                .appendTo(timeContainer);
        }
        $(document.createElement('a'))
            .addClass('time-sch-time-button time-sch-time-button-prev time-sch-button')
            .attr({
            href: '#',
            title: SchedUI.Options.Text.PrevButtonTitle
        })
            .append(SchedUI.Options.Text.PrevButton)
            .click(SchedUI.TimeShift_Clicked)
            .appendTo(timeContainer);
        $(document.createElement('a'))
            .addClass('time-sch-time-button time-sch-time-button-next time-sch-button')
            .attr({
            href: '#',
            title: SchedUI.Options.Text.NextButtonTitle
        })
            .append(SchedUI.Options.Text.NextButton)
            .click(SchedUI.TimeShift_Clicked)
            .appendTo(timeContainer);
    },
    GotoTimeShift_Clicked: function (event) {
        event.preventDefault();
        $(document.createElement('input'))
            .attr('type', 'text')
            .css({
                position: 'absolute',
                left: 0,
                bottom: 0
            })
            .appendTo($(this))
            .datepicker({
            onClose: function () {
                $(this).remove();
            },
            onSelect: function (date) {
                SchedUI.Options.Start = moment(date);
                SchedUI.SetUrlHash("start", SchedUI.Options.Start.toISOString());
                if (typeof SchedUI.Options.GetSections === "function") {
                    SchedUI.Reload(SchedUI.Override);
                } else {
                    SchedUI.Init(SchedUI.Override);
                }
            },
            defaultDate: SchedUI.Options.Start.toDate()
        })
            .datepicker('show')
            .hide();
    },
    TimeShift_Clicked: function (event) {
        var period;
        event.preventDefault();
        period = SchedUI.GetSelectedPeriod();
        if ($(this).is('.time-sch-time-button-today')) {
            SchedUI.Options.Start = moment().startOf('day');
        } else if ($(this).is('.time-sch-time-button-prev')) {
            SchedUI.Options.Start["tsAdd"]('minutes', period.TimeframeOverall * -1);
        } else if ($(this).is('.time-sch-time-button-next')) {
            SchedUI.Options.Start["tsAdd"]('minutes', period.TimeframeOverall);
        }
        SchedUI.SetUrlHash("start", SchedUI.Options.Start.toISOString());
        if (typeof SchedUI.Options.GetSections === "function") {
            SchedUI.Reload(SchedUI.Override);
        } else {
            SchedUI.Init(SchedUI.Override);
        }
    },
    /* Selects the period with the given name */
    SelectPeriod: function (name) {
        SchedUI.Options.SelectedPeriod = name;
        SchedUI.SetUrlHash("period", SchedUI.Options.SelectedPeriod);
        if (typeof SchedUI.Options.GetSections === "function") {
            SchedUI.Reload(SchedUI.Override);
        } else {
            SchedUI.Init(SchedUI.Override);
        }
    },
    Period_Clicked: function (event) {
        event.preventDefault();
        SchedUI.SelectPeriod($(this).data('period').Name);
    }
};
