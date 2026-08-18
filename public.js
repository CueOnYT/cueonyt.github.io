const ctx = document
  .getElementById("trafficChart")
  .getContext("2d");

new Chart(ctx, {

  type: "line",

  data: {

    labels: [
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun"
    ],

    datasets: [

      {
        label: "Visitors",

        data: [
          18,
          26,
          21,
          34,
          29,
          44,
          38
        ],

        borderWidth: 2,

        pointRadius: 3,

        tension: 0.35

      }

    ]

  },

  options: {

    responsive: true,

    maintainAspectRatio: false,

    plugins: {

      legend: {
        display: false
      }

    },

    scales: {

      x: {
        grid: {
          display: false
        }
      },

      y: {

        beginAtZero: true,

        grid: {
          color: "rgba(255,255,255,.06)"
        }

      }

    }

  }

});
