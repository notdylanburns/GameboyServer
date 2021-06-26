from pyboy import PyBoy,WindowEvent
import os
import sys

filename="testroms/gambatte/enable_display/frame1_m2stat_count_ds_2_cgb04c_out90.gbc"

pyboy = PyBoy(filename)
pyboy.set_emulation_speed(1)

for i in range(1000):
    pyboy.tick()
pyboy.stop()