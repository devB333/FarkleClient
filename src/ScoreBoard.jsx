import { useState, useEffect, useRef } from 'react'

function UpdateSelected ({dice})// child component returning ui
{
    console.log(dice)
    return (
        dice.map((currDie) => {
            return <h3>Id: {currDie.id} and Val: {currDie.value}</h3>
        })
    );
}

export default UpdateSelected;