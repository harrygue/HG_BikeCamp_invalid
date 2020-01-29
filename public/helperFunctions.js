let helper = {}

helper.timeDiff = (date1, date2) => {
    let result = "";
    let delta = Math.abs(date2 - date1)/1000 // time in seconds
    if(delta<60){
        result = Math.round(delta) + " seconds ago";
    } else if (delta >= 60 && delta < 3600){
        result = Math.round(delta/60) + " minutes ago";
    } else if (delta <= 3600 && delta < 3600*24){
        result = Math.round(delta/3600) + " hours ago";
    } else {
        result = Math.round(delta/(3600*24)) + " days ago";
    }
    return result;
};

module.exports = helper;