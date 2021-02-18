import axios from "axios";
import htmlParser from "node-html-parser";
const { parse } = htmlParser;
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

const getCount = async (username) => {
  try {
    var contributions = []; // stores contributions...
    var dates = []; // stores dates...
    var streak = 0; // stores streak count...
    var streaks = []; // stores streaks...

    const URL = `https://github.com/users`;
    const date = new Date();
    date.setDate(31);
    date.setMonth(11);
    const DATE = date.toISOString().slice(0, 10);
    date.setFullYear(date.getFullYear() - 1);
    const PREVDATE = date.toISOString().slice(0, 10);

    // Request the last year FIRST ....
    const lastresponse = await axios.get(
      `${URL}/${username}/contributions?to=${PREVDATE}`
    );
    const lastbody = parse(lastresponse.data);
    const lastrects = lastbody.querySelectorAll("rect");

    // There are five examples to excluse so that's why length - 5 is required...
    for (let i = 0; i < lastrects.length - 5; i++) {
      const rect = lastrects[i];
      contributions.push(rect.getAttribute("data-count"));
      dates.push(rect.getAttribute("data-date"));
    }

    // Request current year ....
    const response = await axios.get(
      `${URL}/${username}/contributions?to=${DATE}`
    );
    const body = parse(response.data);
    const rects = body.querySelectorAll("rect");

    // There are five examples to excluse so that's why length - 5 is required...
    for (let i = 0; i < rects.length - 5; i++) {
      const rect = rects[i];
      contributions.push(rect.getAttribute("data-count"));
      dates.push(rect.getAttribute("data-date"));
    }

    // Get the yesterday's date....
    // Streak is counted from yesterday NOT TODAY (This is done because you can still contribute today but will show the streak 0 if counting from today)
    var today = new Date();
    today.setDate(today.getDate() - 1);
    var yesterday = today.toISOString().slice(0, 10); // Returns "yyyy-mm-dd" formate

    var startIndex = dates.indexOf(yesterday); // we will start searching for streaks from yesterday

    // There is no contributions yesterday... streak is 0... so add manually
    if (contributions[startIndex] == 0) {
      streaks.push({
        startDate: yesterday,
        endDate: yesterday,
        streak: 0,
      });
    }
    // look from yesterday to last years's first day
    for (let i = startIndex; i >= 0; i--) {
      if (contributions[i] != 0) {
        // streak is continue...
        streak++;
        if (i === 0) {
          // If you have continued streak at the end...
          streaks.push({
            startDate: dates[i + 1], // Start date of the streak, +1 is for offset
            endDate: dates[i + streak], // End can be be detarmind by adding streak to start date
            streak, // number of streak
          });
        }
      } else {
        if (streak === 0) {
          // no need to add '0' values streak
          continue;
        } else {
          // streak is break with more than '0' value

          // push an object containing details about broken streak
          streaks.push({
            startDate: dates[i + 1], // Start date of the streak, +1 is for offset
            endDate: dates[i + streak], // End can be be detarmind by adding streak to start date
            streak, // number of streak
          });

          // reset streak count for next streak
          streak = 0;
        }
      }
    }

    var finalData = {}; // object that contains final response data
    finalData.currentStreak = streaks[0]; // currently first element in streak is the current streak

    // sort(decending order) the streaks based on streak count
    streaks.sort((a, b) => {
      if (a.streak < b.streak) {
        return 1;
      }
      if (a.streak > b.streak) {
        return -1;
      }
      return 0;
    });
    finalData.highestStreak = streaks[0]; // currently first element in streak is the highest streak

    // total contributions in last two year can be obtained by summing up contribution array
    finalData.totalContributions = contributions.reduce(
      (prev, crnt, indexx) => {
        return Number(prev) + Number(crnt);
      },
      0
    );
    finalData.username = username;
    // return the final data
    return finalData;
  } catch (error) {
    console.log("getCount => ", error.toJSON());
    return {
      message: "Something went wrong",
      error: JSON.stringify(error),
    };
  }
};

const app = express();

const themes = {
  highcontrast: {
    fontcolor1: "white",
    fontcolor2: "grey",
    maincolor: "white",
    ringcolor: "orange",
    background: "black",
  },
  light: {
    fontcolor1: "black",
    fontcolor2: "grey",
    maincolor: "black",
    ringcolor: "orange",
    background: "aliceblue",
  },
  dark: {
    fontcolor1: "white",
    fontcolor2: "grey",
    maincolor: "white",
    ringcolor: "orange",
    background: "#151515",
  },
  radical: {
    fontcolor1: "#fe428e",
    fontcolor2: "#a9fef7",
    maincolor: "#f8d847",
    ringcolor: "#fe428e",
    background: "#151515",
  },
  buefy: {
    fontcolor1: "#7957d5",
    fontcolor2: "#000",
    maincolor: "#ff3860",
    ringcolor: "#7957d5;",
    background: "#fff",
  },
};

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

app.get("", (req, res) => {
  res.send(
    "Add your Github username after url like https://github-streak.herokuapp.com/{YOUR_GITHUB_USERNAME}"
  );
});

app.get("/:user", async (req, res) => {
  try {
    const { user } = req.params;
    var { theme } = req.query;
    if (!themes[theme]) {
      theme = "dark";
    }
    const color1 = themes[theme].fontcolor1;
    const color2 = themes[theme].fontcolor2;
    const maincolor = themes[theme].maincolor;
    const ringcolor = themes[theme].ringcolor;
    const background = themes[theme].background;
    getCount(user)
      .then((data) => {
        var svg = `
        <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        style="isolation: isolate"
        viewBox="0 0 535 195"
        width="535px"
        height="195px"
      >
        <style>
        @keyframes crntstreak {
          0%{
            font-size: 3px;
            opacity:0.2;
          }80%{
            font-size: 40px;
            opacity:1;
          }100%{
            font-size: 34px;
            opacity:1;
          }
        }
        @keyframes fadein{
          0%{
            opacity: 0;
          }
          100%{
            opacity: 1;
          }
        }
        </style>
        <defs>
          <clipPath id="_clipPath_OZGVUqgkTHHpPTYeqOmK3uLgktRVSwWw">
            <rect width="550" height="195" />
          </clipPath>
        </defs>
        <g clip-path="url(#_clipPath_OZGVUqgkTHHpPTYeqOmK3uLgktRVSwWw)">
          <g style="isolation: isolate">
            <path
              d="M 4.5 0 L 530.5 0 C 532.984 0 535 2.016 535 4.5 L 535 190.5 C 535 192.984 532.984 195 530.5 195 L 4.5 195 C 2.016 195 0 192.984 0 190.5 L 0 4.5 C 0 2.016 2.016 0 4.5 0 Z"
              style="fill: ${background};stroke: black"
              />
          </g>
          <g style="isolation: isolate">
            <!-- Total Contributions Big Number -->
            <g transform="translate(1,48)">
              <rect width="163" height="50" stroke="none" fill="none"></rect>
              <text
                x="81.5"
                y="25"
                dominant-baseline="middle"
                stroke-width="0"
                text-anchor="middle"
                style="fill: ${color1}; font-weight: 700; font-size: 28px; opacity: 0; animation: fadein 0.5s linear forwards 0.6s;"
              >
                ${data.totalContributions}
              </text>
            </g>
            <!-- Total Contributions Label -->
            <g transform="translate(1,84)">
              <rect width="163" height="50" stroke="none" fill="none"></rect>
              <text
                x="81.5"
                y="25"
                dominant-baseline="middle"
                stroke-width="0"
                text-anchor="middle"
                style="
                  fill: ${color1};
                  font-weight: 400;
                  font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial,
                    sans-serif;
                  font-size: 14px;
                  opacity: 0; animation: fadein 0.5s linear forwards 0.7s;
                "
              >
                Total Contributions
              </text>
            </g>
            <!-- total contributions range -->
            <g transform="translate(1,114)">
              <rect width="163" height="50" stroke="none" fill="none"></rect>
              <text
                x="81.5"
                y="25"
                dominant-baseline="middle"
                stroke-width="0"
                text-anchor="middle"
                style="
                  fill: ${color2};
                  font-weight: 400;
                  font-size: 12px;
                  font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial,
                    sans-serif;
                  opacity: 0; animation: fadein 0.5s linear forwards 0.8s;
                "
              >
                Last two years
              </text>
            </g>
          </g>
          <g style="isolation: isolate">
            <!-- Current Streak Big Number -->
            <g transform="translate(166,48)">
              <rect width="163" height="50" stroke="none" fill="none"></rect>
              <text
                x="81.5"
                y="25"
                dominant-baseline="middle"
                stroke-width="0"
                text-anchor="middle"
                style="fill: ${maincolor}; font-weight: 700; font-size: 34px; animation: crntstreak 0.6s linear forwards"
              >
                ${data.currentStreak.streak}
              </text>
            </g>
            <!-- Current Streak Label -->
            <g transform="translate(166,108)">
              <rect width="163" height="50" stroke="none" fill="none"></rect>
              <text
                x="81.5"
                y="25"
                dominant-baseline="middle"
                stroke-width="0"
                text-anchor="middle"
                style="
                  fill: ${maincolor};
                  font-weight: 700;
                  font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial,
                    sans-serif;
                    opacity: 0; animation: fadein 0.5s linear forwards 0.9s;
                "
              >
                Current Streak
              </text>
            </g>
            <!-- Current Streak Range -->
            <g transform="translate(166,145)">
              <rect width="163" height="26" stroke="none" fill="none"></rect>
              <text
                x="81.5"
                y="13"
                dominant-baseline="middle"
                stroke-width="0"
                text-anchor="middle"
                style="
                  fill: ${color2};
                  font-size: 14px;
                  font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial,
                    sans-serif;
                    opacity: 0; animation: fadein 0.5s linear forwards 0.9s;
                "
              >
                ${data.currentStreak.startDate} ~ ${data.currentStreak.endDate}
              </text>
            </g>
            <!-- mask for background behind fire -->
            <defs>
              <mask id="cut-off-area">
                <rect x="0" y="0" width="500" height="500" fill="white" />
                <ellipse cx="247.5" cy="31" rx="13" ry="18" />
              </mask>
            </defs>
            <!-- ring around number -->
            <circle
              cx="247.5"
              cy="71"
              r="40"
              mask="url(#cut-off-area)"
              style="fill: none; stroke: ${ringcolor}; stroke-width: 5; opacity: 0; animation: fadein 0.5s linear forwards 0.4s;"
            ></circle>
            <!-- fire icon -->
            <g style="opacity: 0; animation: fadein 0.5s linear forwards 0.6s;">
              <path
                d=" M 235.5 19.5 L 259.5 19.5 L 259.5 43.5 L 235.5 43.5 L 235.5 19.5 Z "
                fill="none"
              />
              <path
                d=" M 249 20.17 C 249 20.17 249.74 22.82 249.74 24.97 C 249.74
              27.03 248.39 28.7 246.33 28.7 C 244.26 28.7 242.7 27.03 242.7 24.97
              L 242.73 24.61 C 240.71 27.01 239.5 30.12 239.5 33.5 C 239.5 37.92
              243.08 41.5 247.5 41.5 C 251.92 41.5 255.5 37.92 255.5 33.5 C 255.5
              28.11 252.91 23.3 249 20.17 Z M 247.21 38.5 C 245.43 38.5 243.99
              37.1 243.99 35.36 C 243.99 33.74 245.04 32.6 246.8 32.24 C 248.57
              31.88 250.4 31.03 251.42 29.66 C 251.81 30.95 252.01 32.31 252.01
              33.7 C 252.01 36.35 249.86 38.5 247.21 38.5 Z "
                fill="orange"
              />
            </g>
          </g>
          <g style="isolation: isolate;">
            <!-- Longest Streak Big Number -->
            <g transform="translate(350,48)">
              <rect width="163" height="50" stroke="none" fill="none"></rect>
              <text
                x="81.5"
                y="25"
                dominant-baseline="middle"
                stroke-width="0"
                text-anchor="middle"
                style="fill: ${color1}; font-weight: 700; font-size: 28px; opacity: 0; animation: fadein 0.5s linear forwards 1.2s;"
              >
                ${data.highestStreak.streak}
              </text>
            </g>
            <!-- Longest Streak Label -->
            <g transform="translate(350,84)">
              <rect width="163" height="50" stroke="none" fill="none"></rect>
              <text
                x="81.5"
                y="25"
                dominant-baseline="middle"
                stroke-width="0"
                text-anchor="middle"
                style="
                  fill: ${color1};
                  font-weight: 400;
                  font-size: 14px;
                  font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial,
                    sans-serif;
                    opacity: 0; animation: fadein 0.5s linear forwards 1.3s;
                "
              >
                Longest Streak
              </text>
            </g>
            <!-- Longest Streak Range -->
            <g transform="translate(350,114)">
              <rect width="163" height="50" stroke="none" fill="none"></rect>
              <text
                x="81.5"
                y="25"
                dominant-baseline="middle"
                stroke-width="0"
                text-anchor="middle"
                style="
                  fill: ${color2};
                  font-weight: 400;
                  font-size: 12px;
                  font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial,
                    sans-serif;
                    opacity: 0; animation: fadein 0.5s linear forwards 1.4s;
                "
              >
                ${data.highestStreak.startDate} ~ ${data.highestStreak.endDate}
                </text>
            </g>
          </g>
        </g>
      </svg>`;
        res.header("Content-Type", "image/svg+xml");
        res.status(200).send(svg);
      })
      .catch((error) => {
        res.status(404).send({ message: "Something went wrong", error });
      });
  } catch (error) {
    console.log("Route /:user => ", error);
    res.status(501).json({ error });
  }
});
