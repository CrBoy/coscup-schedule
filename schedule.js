"use strict"

var vm = new Vue({
	el: "#schedule",
	data: {
		//current_date: new Date("Fri Aug 04 2017")
		current_date: new Date("Fri Aug 05 2017"),
		current_event: null,
		event_details_style: {top: 0, left: 0},
		dates: [new Date("Fri Aug 04 2017"), new Date("Fri Aug 05 2017"), new Date("Fri Aug 06 2017")],
		tag_list: [],
		places: [],
		events: {},
		loaded: false
	},
	computed: {
		tags: function(){
			return this.tag_list.filter(t => t.enabled).map(t => t.name)
		},
		hidden_places: function(){
			return Object.keys(this.events).filter(p => this.places.indexOf(p) < 0)
		},
		visible_events: function(){
			return this.places.reduce((obj, p) => {
				var events_here = this.events[p].map(e => {
					if (e.begin.toDateString() !== this.current_date.toDateString()) return null

					var primary_tag = e.tags.find(t => this.tags.indexOf(t) >= 0)
					if (primary_tag) {
						return {
							tags: e.tags,
							begin: e.begin,
							end: e.end,
							owner: e.owner,
							subject: e.subject,
							description: e.description,
							classes: ["type" + this.tags.indexOf(primary_tag)],
							style: {
								top: vm.px_in_col(e.begin) + 'px',
								height: vm.px_in_col(e.end) - vm.px_in_col(e.begin) + 'px'
							}
						}
					} else {
						return null
					}
				}).filter(e => e)

				var chunks = [], tracks = [], latest = 0
				for (var i in events_here) {
					var e = events_here[i]

					if (e.begin >= latest && tracks.length > 0) {
						// new chunk
						chunks.push(tracks)
						tracks = []
					}

					var track = tracks.find(t => e.begin >= t[t.length-1].end)
					if (track) // add to track
						track.push(e)
					else // new track
						tracks.push([e])

					if (latest < e.end) latest = e.end
				}
				chunks.push(tracks) // finalize

				chunks.forEach(tracks => {
					var w = 96/(tracks.length)
					tracks.forEach((events, i) => {
						events.forEach(e => {
							e.style.width = w + '%'
							e.style.left = w*i + '%'
						})
					})
				})

				obj[p] = events_here
				return obj
			}, {})
		}
	},
	methods: {
		moment: moment,
		px_in_col: function(time) {
			var minutes = time.getHours() * 60 + time.getMinutes()
			return (100*24) * minutes / (60*24)
		},
		display_time: function(time) {
			return moment(time).format("HH:mm")
		},
		show_event_details: function(e, $event) {
			this.current_event = e
			if(e) this.event_details_style.top = e.style.top
		}
	},
	mounted: function(){
		/*
		axios.get("0804.json", {responseType: "json"}).then(function(res){
			return // FIXME
			var data = res.data
			var events = data.places.reduce((obj, p) => {
				obj[p] = []
				return obj
			}, {})
			data.events.reduce((obj, e) => {
				if(typeof obj[e.place] == "undefined") obj[e.place] = []
				e.classes = []
				obj[e.place].push(e)
				return obj
			}, events)
			Object.keys(events).forEach(function(p){
				var es = events[p]
				es.sort((e1, e2) => e1.begin - e2.begin)
			})

			vm.tag_list = data.tags.map(t => {name: t, enabled: true})
			vm.places = data.places
			vm.events = events
			vm.loaded = true
		})
		*/

		// load submissions
		axios.get("https://coscup.org/2017-assets/json/submissions.json", {responseType: "json"}).then(function(res){
			var data = res.data
			var events = data.reduce((obj, e) => {
				if(typeof obj[e.room] == "undefined") obj[e.room] = []
				obj[e.room].push({
					tags: ["議程"],
					place: e.room,
					begin: new Date(e.start),
					end: new Date(e.end),
					owner: e.speaker.name,
					subject: e.subject,
					description: e.summary,
					classes: [],
				})
				return obj
			}, {})
			Object.keys(events).forEach(function(p){
				var es = events[p]
				es.sort((e1, e2) => e1.begin - e2.begin)
			})

			vm.tag_list.push({name: "議程", enabled: true})
			vm.places = Object.keys(events)
			vm.events = events
			vm.loaded = true

			var scroll = document.getElementsByClassName("scroll-wrapper")[0]
			scroll.style.height = (window.innerHeight - scroll.offsetTop - 2) + "px"
			scroll.scrollTop = 850
		})
	}
})

